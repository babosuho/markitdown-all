"""
Generate complex and edge-case test files:
1. Multi-sheet Excel (.xlsx) with merged cells, formatting, formulas
2. Legacy CP949 / EUC-KR CSV with internal commas and quotes
3. Complex Word (.docx) with nested bullets and tables
"""
from pathlib import Path
import openpyxl
from openpyxl.styles import Font, Alignment
import docx

def generate_all():
    test_dir = Path("tests/test_files")
    test_dir.mkdir(parents=True, exist_ok=True)

    # 1. Complex Excel
    wb = openpyxl.Workbook()
    # Sheet 1: 2026_예산집행
    ws1 = wb.active
    ws1.title = "2026_예산집행"
    ws1.merge_cells("A1:E1")
    ws1["A1"] = "2026년도 부산시 소상공인 에너지바우처 예산 총괄표"
    ws1["A1"].font = Font(size=14, bold=True)
    ws1["A1"].alignment = Alignment(horizontal="center")

    headers1 = ["사업구분", "총예산(원)", "집행액(원)", "집행률(%)", "비고"]
    ws1.append([])  # blank row
    ws1.append(headers1)
    ws1.append(["전기요금 지원", 1500000000, 1200000000, "80.0%", "지급 완료"])
    ws1.append(["유류비 지원", 800000000, 600000000, "75.0%", "2차 접수 중"])
    ws1.append(["운영 및 시스템비", 200000000, 150000000, "75.0%", "정상 집행"])
    ws1.append(["합계", 2500000000, 1950000000, "78.0%", ""])

    # Sheet 2: 지원_대상자명부
    ws2 = wb.create_sheet(title="지원_대상자명부")
    ws2.append(["연번", "대표자명", "상호명", "개업일자", "선정결과", "특이사항"])
    ws2.append([1, "홍길동", "(주)부산에너지", "2025-03-15", "적격", "※ 서류 보완 완료"])
    ws2.append([2, "김철수", "해운대카페", "2026-01-20", "적격", ""])
    ws2.append([3, "이영희", "동백마트", "2024-11-05", "보류", "★ 매출 증빙 확인 필요"])
    ws2.append([4, "박영수", "남포물류", "2026-08-30", "부적격", "매출액 기준 초과(>3억)"])

    xlsx_path = test_dir / "complex_multisheet.xlsx"
    wb.save(xlsx_path)
    print(f"Created {xlsx_path}")

    # 2. Legacy CP949 / EUC-KR CSV
    csv_text = (
        '구분,업체명,소재지,연간매출액,비고\n'
        '01,동백제과,"부산광역시 해운대구 우동, 123-4",150000000,"※ 정상 영업 중, 세금계산서 첨부"\n'
        '02,자갈치식당,"부산광역시 중구 남포동, 자갈치시장 5호",85000000,"★ 2026년 신규 개업자"\n'
        '03,광안리상회,부산광역시 수영구 광안동,240000000,"■ 카드매출, 현금영수증 합산"\n'
    )
    csv_path = test_dir / "euckr_legacy_broken.csv"
    with open(csv_path, "wb") as f:
        f.write(csv_text.encode("cp949"))
    print(f"Created {csv_path}")

    # 3. Complex Word Document (.docx)
    doc = docx.Document()
    doc.add_heading("소상공인 지원사업 심사 지침서 (Word)", level=1)
    doc.add_paragraph("본 지침서는 에너지바우처 지급 대상자를 심사하기 위한 세부 기준을 기술합니다.")

    doc.add_heading("1. 기본 자격 요건", level=2)
    p1 = doc.add_paragraph("다음 요건을 모두 충족해야 지원 대상으로 최종 승인됩니다:")
    p1.style = "List Bullet"
    doc.add_paragraph("사업자등록증상 사업장 소재지가 부산광역시일 것").style = "List Bullet"
    doc.add_paragraph("연간 총매출액이 0원 초과 3억원 이하일 것").style = "List Bullet"
    doc.add_paragraph("신청일 현재 국세청 기준 휴·폐업 상태가 아닐 것").style = "List Bullet"

    doc.add_heading("2. 서류별 가중치 및 배점표", level=2)
    table = doc.add_table(rows=1, cols=4)
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = "평가 항목"
    hdr_cells[1].text = "배점"
    hdr_cells[2].text = "제출 서류"
    hdr_cells[3].text = "확인 방법"

    row1 = table.add_row().cells
    row1[0].text = "매출 적격성"
    row1[1].text = "50점"
    row1[2].text = "전자세금계산서 / 카드매출"
    row1[3].text = "홈택스 누계 조회"

    row2 = table.add_row().cells
    row2[0].text = "사업 영속성"
    row2[1].text = "30점"
    row2[2].text = "총사업자등록내역 사실증명"
    row2[3].text = "정부24 및 홈택스"

    row3 = table.add_row().cells
    row3[0].text = "지역 기여도"
    row3[1].text = "20점"
    row3[2].text = "사업장 임대차계약서"
    row3[3].text = "소재지 일치 확인"

    docx_path = test_dir / "complex_document.docx"
    doc.save(docx_path)
    print(f"Created {docx_path}")

if __name__ == "__main__":
    generate_all()
