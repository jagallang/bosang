#!/usr/bin/env python3
"""
보상드림 2차 객관식 77문항 → PPT 영상강의 자료
흰 배경 + 진한 남색 글씨 + 디자인 요소(상단 바, 문제 배경박스)
"""
import json, os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

WHITE = RGBColor(0xFF, 0xFF, 0xFF)
NAVY = RGBColor(0x0A, 0x1A, 0x5C)
DARK = RGBColor(0x15, 0x25, 0x65)
RED = RGBColor(0xC0, 0x20, 0x20)
GRAY = RGBColor(0x66, 0x66, 0x66)
LIGHT_BG = RGBColor(0xF0, 0xF2, 0xF8)  # 문제 배경
ACCENT = RGBColor(0x1A, 0x3C, 0xA8)    # 상단 바
NUM = ["①", "②", "③", "④", "⑤"]

script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, '..', 'questions.json'), 'r', encoding='utf-8') as f:
    all_q = json.load(f)
mcq2 = [q for q in all_q if q.get('stage') == 2 and q.get('type') == 'mcq']
print(f"2차 mcq: {len(mcq2)}문항")

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)


def set_bg(slide):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = WHITE


def top_bar(slide, text="보상드림  ·  2차 시험 대비"):
    """상단 남색 바 + 브랜드 텍스트"""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0,
        prs.slide_width, Inches(0.55))
    shape.fill.solid()
    shape.fill.fore_color.rgb = NAVY
    shape.line.fill.background()
    tf = shape.text_frame
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.text = f"    {text}"
    p.font.size = Pt(14)
    p.font.color.rgb = RGBColor(0xA0, 0xB0, 0xD0)
    p.font.bold = False


def bottom_bar(slide, left_text, right_text=""):
    """하단 페이지 정보"""
    tb = slide.shapes.add_textbox(
        Inches(0.6), Inches(7.0), Inches(12.1), Inches(0.4))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.text = left_text
    p.font.size = Pt(11)
    p.font.color.rgb = RGBColor(0xAA, 0xAA, 0xAA)
    p.alignment = PP_ALIGN.RIGHT


def add_tf(slide, left, top, width, height):
    tb = slide.shapes.add_textbox(
        Inches(left), Inches(top), Inches(width), Inches(height))
    tf = tb.text_frame
    tf.word_wrap = True
    return tf


def para(tf, text, size, color=NAVY, bold=True,
         align=PP_ALIGN.LEFT, after=14, first=False):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.text = text
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = "맑은 고딕"
    p.alignment = align
    p.space_after = Pt(after)
    p.line_spacing = Pt(size * 1.5)
    return p


def q_bg_box(slide, top, height):
    """문제 영역 연한 배경 박스"""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(0.4), Inches(top),
        Inches(12.5), Inches(height))
    shape.fill.solid()
    shape.fill.fore_color.rgb = LIGHT_BG
    shape.line.fill.background()


def calc_total(q):
    t = len(q['q'])
    for o in q.get('opt', []):
        t += len(o)
    return t


def question_slide(q, idx, total):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    top_bar(slide)
    bottom_bar(slide, f"{idx} / {total}")

    q_text = q['q']
    tc = calc_total(q)

    # 총 글자수 기반 폰트 자동 조정 — 화면 벗어남 방지
    if tc > 700:
        q_sz, o_sz, sp = 16, 14, 6
    elif tc > 550:
        q_sz, o_sz, sp = 18, 16, 8
    elif tc > 400:
        q_sz, o_sz, sp = 22, 18, 10
    elif tc > 280:
        q_sz, o_sz, sp = 24, 20, 12
    else:
        q_sz, o_sz, sp = 28, 22, 14

    # 문제 배경 박스 (문제 길이에 따라 높이 조정)
    q_lines = max(1, len(q_text) // 45 + 1)
    q_box_h = min(2.2, 0.5 + q_lines * 0.45)
    q_bg_box(slide, 0.7, q_box_h)

    # 문제 텍스트 (배경 위에)
    tf_q = add_tf(slide, 0.7, 0.8, 11.9, q_box_h)
    para(tf_q, f" {idx}. {q_text}",
         q_sz, NAVY, True, after=0, first=True)

    # 선택지 (배경 아래)
    opt_top = 0.9 + q_box_h + 0.15
    tf_o = add_tf(slide, 0.7, opt_top, 11.9, 7.0 - opt_top)

    for i, opt in enumerate(q.get('opt', [])):
        para(tf_o, f"  {NUM[i]}  {opt}",
             o_sz, DARK, True, after=sp,
             first=(i == 0))


def answer_slide(q, idx, total):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    top_bar(slide, f"보상드림  ·  Q{idx} 정답해설")
    bottom_bar(slide, f"{idx} / {total}")

    ai = q.get('a', 0)
    a_opt = q.get('opt', [''])[ai] if q.get('opt') else ''
    ex = q.get('ex', '')

    # 정답 배경 박스
    q_bg_box(slide, 0.7, 1.0)

    tf = add_tf(slide, 0.7, 0.8, 11.9, 1.0)
    para(tf, f"  {idx}번  정답 :  {NUM[ai]}",
         34, RED, True, after=0, first=True)

    # 정답 선택지
    if a_opt:
        a_sz = 20 if len(a_opt) <= 120 else 17
        tf2 = add_tf(slide, 0.7, 1.9, 11.9, 1.2)
        para(tf2, f"  {NUM[ai]}  {a_opt}",
             a_sz, NAVY, True, after=0, first=True)

    # 해설 구분선
    sep_top = 3.2
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(0.6), Inches(sep_top),
        Inches(12.1), Inches(0.03))
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor(0xDD, 0xDD, 0xDD)
    shape.line.fill.background()

    if ex:
        tf3 = add_tf(slide, 0.7, sep_top + 0.15, 11.9, 3.8)
        para(tf3, "해설", 14, ACCENT, True, after=8, first=True)
        ex_sz = 20
        if len(ex) > 350:
            ex_sz = 15
        elif len(ex) > 250:
            ex_sz = 17
        elif len(ex) > 150:
            ex_sz = 18
        para(tf3, ex, ex_sz, DARK, False, after=8)


# 표지
cover = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(cover)
# 표지 상단 큰 바
shape = cover.shapes.add_shape(
    MSO_SHAPE.RECTANGLE, 0, 0,
    prs.slide_width, Inches(3.2))
shape.fill.solid()
shape.fill.fore_color.rgb = NAVY
shape.line.fill.background()
tf_c = add_tf(cover, 0, 0.6, 13.333, 2.5)
para(tf_c, "보상드림", 60, WHITE, True,
     PP_ALIGN.CENTER, 16, True)
para(tf_c, "보상관리사 2차 시험 · 객관식 예상문제",
     28, RGBColor(0xA0, 0xB0, 0xD0), False, PP_ALIGN.CENTER)

tf_c2 = add_tf(cover, 0, 3.8, 13.333, 2.5)
para(tf_c2, "77문항", 48, NAVY, True,
     PP_ALIGN.CENTER, 12, True)
para(tf_c2, "문제 + 정답해설", 24, GRAY, False,
     PP_ALIGN.CENTER)

total = len(mcq2)
for i, q in enumerate(mcq2):
    question_slide(q, i + 1, total)
    answer_slide(q, i + 1, total)
    if (i + 1) % 10 == 0:
        print(f"  {i+1}/{total}")

out = os.path.expanduser("~/Desktop/보상드림_2차_객관식_77문항.pptx")
prs.save(out)
print(f"\n✓ {out}")
print(f"  슬라이드: {len(prs.slides)}개")
