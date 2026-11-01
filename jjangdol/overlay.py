"""화면 구석에 떠 있는 짱돌 (PySide6).

- 투명 배경, 항상 위, 작업표시줄·Alt+Tab에 안 뜸, 눌러도 게임 포커스 안 뺏음
- 왼쪽 버튼으로 끌어서 이동, 마우스 휠로 크기 조절 (위치·크기는 state/overlay.json에 기억)
- 오른쪽 클릭: 크기·위치 초기화 / 짱돌 끄기
- click_through = true면 마우스가 짱돌을 그냥 통과 (게임할 때. 위치는 끄고 미리 정해두기)
"""

from __future__ import annotations

import json
import math
import signal
import time
from datetime import datetime
from pathlib import Path

from PySide6.QtCore import QPoint, QPointF, QRectF, Qt, QTimer
from PySide6.QtGui import (
    QBrush,
    QColor,
    QFont,
    QFontMetricsF,
    QGuiApplication,
    QPainter,
    QPainterPath,
    QPen,
    QRadialGradient,
)
from PySide6.QtWidgets import QApplication, QMenu, QWidget

from .mood import Presence

ROOT = Path(__file__).resolve().parent.parent
STATE_FILE = ROOT / "state" / "overlay.json"

# 기준 크기 (배율 1.0일 때). 위쪽은 말풍선 자리, 아래쪽이 돌멩이
BASE_W, BASE_H = 320, 300
ROCK_CX, ROCK_CY = 160.0, 222.0
ROCK_RX, ROCK_RY = 92.0, 64.0
GROUND = ROCK_RY * 0.9  # 돌멩이 바닥 (중심 기준)

# 울퉁불퉁한 정도 (고정값 → 항상 같은 돌멩이)
_BUMPS = [0.04, -0.02, 0.07, 0.01, -0.05, 0.03, 0.06, -0.03, 0.02, -0.06, 0.05, 0.0]
_SPECKS = [(-48, -22, 3.0), (32, -34, 2.2), (58, 2, 2.6), (-62, 8, 1.8), (8, -44, 1.6), (-24, 34, 2.0)]

INK = QColor("#2b2522")
MOUTH_DARK = QColor("#3a1d1d")
TONGUE = QColor("#d9687a")
TEETH = QColor("#f2efe8")


def _rock_path() -> QPainterPath:
    n = len(_BUMPS)
    pts = []
    for i, bump in enumerate(_BUMPS):
        a = 2 * math.pi * i / n
        x = math.cos(a) * ROCK_RX * (1 + bump)
        y = math.sin(a) * ROCK_RY * (1 + bump)
        if y > 0:
            y *= 0.88  # 바닥은 살짝 납작하게
        pts.append(QPointF(x, y))
    mids = [(pts[i] + pts[(i + 1) % n]) / 2 for i in range(n)]
    path = QPainterPath(mids[-1])
    for i in range(n):
        path.quadTo(pts[i], mids[i])
    path.closeSubpath()
    return path


class RockOverlay(QWidget):
    def __init__(self, speaker, presence: Presence, cfg: dict, state_file: Path = STATE_FILE):
        flags = (
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
            | Qt.WindowType.WindowDoesNotAcceptFocus
        )
        if cfg.get("click_through", False):
            flags |= Qt.WindowType.WindowTransparentForInput
        super().__init__(None, flags)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating)
        self.setWindowTitle("짱돌")
        self.setWindowOpacity(float(cfg.get("opacity", 1.0)))

        self._speaker = speaker
        self._presence = presence
        self._cfg = cfg
        self._state_file = state_file
        self._rock = _rock_path()
        self._font = QFont()
        self._font.setFamilies(["Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", "WenQuanYi Zen Hei"])
        self._font.setPixelSize(15)
        self._font.setBold(True)

        self._t0 = time.monotonic()
        self._mouth = 0.0      # 입 벌림 0~1 (소리 크기를 부드럽게 따라감)
        self._mood = "idle"
        self._hop = 0.0        # 놀랐을 때 점프 높이 (점점 줄어듦)
        self._bubble_text = ""
        self._bubble_until = 0.0
        self._drag: QPoint | None = None

        saved = self._load_state()
        self._scale = float(saved.get("scale", cfg.get("size", 1.0)))
        self.resize(int(BASE_W * self._scale), int(BASE_H * self._scale))
        if not self._restore_position(saved):
            self._move_to_corner()

        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._timer.start(33)  # 약 30fps

    # ── 상태 갱신 ───────────────────────────────────────

    def _tick(self) -> None:
        now = time.monotonic()
        info = self._speaker.now_playing
        target = self._speaker.level if info is not None else 0.0
        self._mouth += (target - self._mouth) * (0.6 if target > self._mouth else 0.25)

        mood = self._current_mood(info)
        if mood == "surprised" and self._mood != "surprised":
            self._hop = 1.0
        self._mood = mood
        self._hop *= 0.86

        if info and info.get("text"):
            self._bubble_text = info["text"]
            self._bubble_until = now + float(self._cfg.get("bubble_linger", 3.0))

        if self._presence.quit_message is not None:
            QApplication.quit()
        self.update()

    def _current_mood(self, info: dict | None) -> str:
        if info is not None:
            return info.get("mood") or "talk"
        if self._presence.thinking:
            return "thinking"
        idle = self._presence.idle_seconds()
        if idle > 120 and 1 <= datetime.now().hour < 6:
            return "sleepy"
        if idle > float(self._cfg.get("sulk_after", 600)):
            return "sulk"
        return "idle"

    # ── 그리기 ─────────────────────────────────────────

    def paintEvent(self, _event) -> None:
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        p.setRenderHint(QPainter.RenderHint.TextAntialiasing)
        p.scale(self._scale, self._scale)
        t = time.monotonic() - self._t0

        self._paint_bubble(p, t)

        dx, dy, rot, sx, sy = self._motion(t)
        # 그림자 (점프하면 작아짐)
        shrink = 1 - 0.4 * min(1.0, -dy / 30) if dy < 0 else 1.0
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(QColor(0, 0, 0, 55))
        p.drawEllipse(QPointF(ROCK_CX + dx, ROCK_CY + GROUND + 4), 78 * shrink, 9 * shrink)

        p.save()
        p.translate(ROCK_CX + dx, ROCK_CY + dy)
        p.rotate(rot)
        p.translate(0, GROUND)          # 바닥 기준으로 늘였다 줄였다
        p.scale(1 + sx, 1 + sy)
        p.translate(0, -GROUND)
        self._paint_rock(p)
        self._paint_mouth(p, t)
        p.restore()

        self._paint_effects(p, t, dx, dy)
        p.end()

    def _motion(self, t: float) -> tuple[float, float, float, float, float]:
        """(dx, dy, 회전, 가로 늘림, 세로 늘림)"""
        breath = math.sin(t * 2.2)
        m, o = self._mood, self._mouth
        dx = rot = sx = 0.0
        dy = -5.0 * o
        sy = 0.012 * breath
        if m == "laugh":
            dy -= 5 * abs(math.sin(t * 13))
            rot = 3 * math.sin(t * 13)
        elif m == "angry":
            dx = 2.2 * math.sin(t * 70)  # 부르르
            sy += 0.02
        elif m == "surprised":
            dy -= 24 * self._hop
            sy += 0.06 * self._hop
        elif m == "smug":
            rot, sx = -5.0, 0.02
        elif m == "sulk":
            rot, sx, sy = -7.0, 0.03, -0.07 + 0.006 * breath  # 축 처짐
        elif m == "thinking":
            rot = 7.0  # 갸웃
        elif m == "sleepy":
            rot, sy = 3.0, -0.05 + 0.02 * math.sin(t * 1.2)
        return dx, dy, rot, sx, sy

    def _paint_rock(self, p: QPainter) -> None:
        grad = QRadialGradient(QPointF(-30, -30), 140)
        grad.setColorAt(0.0, QColor("#cfccc6"))
        grad.setColorAt(0.6, QColor("#9c9891"))
        grad.setColorAt(1.0, QColor("#6d6963"))
        p.setPen(QPen(QColor("#4a4743"), 3))
        p.setBrush(QBrush(grad))
        p.drawPath(self._rock)
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(QColor(80, 76, 70, 120))
        for x, y, r in _SPECKS:
            p.drawEllipse(QPointF(x, y), r, r)
        p.setBrush(QColor(255, 255, 255, 70))
        p.drawEllipse(QPointF(-40, -36), 18, 8)  # 반짝

    def _paint_mouth(self, p: QPainter, t: float) -> None:
        p.save()
        p.translate(0, 16)
        o, m = self._mouth, self._mood
        lip = QPen(INK, 3.5, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap, Qt.PenJoinStyle.RoundJoin)

        def filled() -> None:
            p.setPen(lip)
            p.setBrush(MOUTH_DARK)

        if m == "laugh":
            h = 12 + 16 * o
            path = QPainterPath(QPointF(-26, -3))
            path.lineTo(26, -3)
            path.quadTo(0, -3 + 2 * h, -26, -3)
            filled()
            p.drawPath(path)
            p.setPen(Qt.PenStyle.NoPen)
            p.setBrush(TONGUE)
            p.drawEllipse(QPointF(0, -3 + h * 0.72), 9, h * 0.22)
        elif m == "angry":
            h = 9 + 14 * o
            filled()
            p.drawRoundedRect(QRectF(-24, -h / 2, 48, h), 6, 6)
            p.setPen(Qt.PenStyle.NoPen)
            p.setBrush(TEETH)
            p.drawRect(QRectF(-20, -h / 2 + 2, 40, min(5.0, h / 3)))
        elif m == "surprised":
            r = 8 + 8 * o + 6 * self._hop
            filled()
            p.drawEllipse(QPointF(0, 0), r * 0.8, r)
        elif m == "sulk":
            path = QPainterPath(QPointF(-14, 6))
            path.quadTo(0, -6 - 6 * o, 14, 6)
            p.setPen(lip)
            p.setBrush(Qt.BrushStyle.NoBrush)
            p.drawPath(path)
        elif m == "sleepy":
            r = 5 + 1.5 * math.sin(t * 1.2)
            filled()
            p.drawEllipse(QPointF(4, 2), r, r * 0.8)
            p.setPen(Qt.PenStyle.NoPen)
            p.setBrush(QColor(150, 200, 255, 190))
            p.drawEllipse(QPointF(11, 9 + 2 * math.sin(t * 1.2)), 2.5, 4)  # 침
        elif o > 0.05:  # 말하는 중 (talk, smug)
            h, w = 4 + 24 * o, 34 + 8 * o
            filled()
            p.drawEllipse(QRectF(-w / 2, -h / 2, w, h))
            if o > 0.45:
                p.setPen(Qt.PenStyle.NoPen)
                p.setBrush(TONGUE)
                p.drawEllipse(QPointF(0, h * 0.28), w * 0.22, h * 0.16)
        elif m == "smug":
            path = QPainterPath(QPointF(-20, 2))
            path.quadTo(6, 9, 22, -8)  # 히죽
            p.setPen(lip)
            p.setBrush(Qt.BrushStyle.NoBrush)
            p.drawPath(path)
        elif m == "thinking":
            path = QPainterPath(QPointF(-10, 3))
            path.lineTo(12, -1)  # 흠...
            p.setPen(lip)
            p.drawPath(path)
        else:  # idle
            path = QPainterPath(QPointF(-20, 0))
            path.quadTo(0, 9, 20, 0)
            p.setPen(lip)
            p.setBrush(Qt.BrushStyle.NoBrush)
            p.drawPath(path)
        p.restore()

    def _paint_bubble(self, p: QPainter, t: float) -> None:
        if not self._cfg.get("bubble", True):
            return
        now = time.monotonic()
        fade = 0.6
        if self._mood == "thinking":
            text, alpha = "." * (1 + int(t * 3) % 3), 1.0
        elif self._bubble_text and now < self._bubble_until + fade:
            text = self._bubble_text
            alpha = 1.0 if now < self._bubble_until else 1 - (now - self._bubble_until) / fade
        else:
            return

        p.save()
        p.setOpacity(max(0.0, alpha))
        p.setFont(self._font)
        fm = QFontMetricsF(self._font)
        flags = Qt.TextFlag.TextWordWrap | Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter
        text_rect = fm.boundingRect(QRectF(0, 0, BASE_W - 48, 1000), flags, text)
        w = max(text_rect.width(), 22) + 26
        h = min(text_rect.height(), 4 * fm.lineSpacing()) + 18
        x = (BASE_W - w) / 2
        y = ROCK_CY - ROCK_RY - 26 - h

        shape = QPainterPath()
        shape.addRoundedRect(QRectF(x, y, w, h), 14, 14)
        tail = QPainterPath(QPointF(BASE_W / 2 - 12, y + h - 2))
        tail.lineTo(BASE_W / 2 + 2, y + h + 16)
        tail.lineTo(BASE_W / 2 + 10, y + h - 2)
        tail.closeSubpath()
        shape = shape.united(tail)

        p.setPen(QPen(INK, 2))
        p.setBrush(QColor(255, 255, 255, 242))
        p.drawPath(shape)
        p.setPen(QColor("#1d1a17"))
        p.drawText(QRectF(x + 13, y + 9, w - 26, h - 18), flags, text)
        p.restore()

    def _paint_effects(self, p: QPainter, t: float, dx: float, dy: float) -> None:
        top = QPointF(ROCK_CX + dx, ROCK_CY + dy - ROCK_RY)
        m = self._mood
        if m == "sleepy":
            p.setPen(INK)
            for i, size in enumerate((13, 17, 22)):
                phase = (t * 0.5 + i / 3) % 1.0
                font = QFont(self._font)
                font.setPixelSize(size)
                p.setFont(font)
                p.setOpacity(1 - phase)
                p.drawText(QPointF(top.x() + 40 + 18 * phase + 8 * i, top.y() + 10 - 40 * phase - 6 * i), "Z")
            p.setOpacity(1.0)
        elif m == "angry":
            p.setPen(Qt.PenStyle.NoPen)
            for i in range(3):
                phase = (t * 1.5 + i / 3) % 1.0
                p.setBrush(QColor(255, 255, 255, int(200 * (1 - phase))))
                side = -1 if i % 2 else 1
                p.drawEllipse(QPointF(top.x() + side * (50 + 10 * phase), top.y() + 6 - 30 * phase), 6 + 6 * phase, 6 + 6 * phase)
        elif m == "surprised" and self._hop > 0.2:
            font = QFont(self._font)
            font.setPixelSize(34)
            p.setFont(font)
            p.setPen(QColor("#d23c3c"))
            p.drawText(QPointF(top.x() + 84, top.y() + 40), "!")

    # ── 마우스 ─────────────────────────────────────────

    def mousePressEvent(self, e) -> None:
        if e.button() == Qt.MouseButton.LeftButton:
            self._drag = e.globalPosition().toPoint() - self.frameGeometry().topLeft()

    def mouseMoveEvent(self, e) -> None:
        if self._drag is not None and e.buttons() & Qt.MouseButton.LeftButton:
            self.move(e.globalPosition().toPoint() - self._drag)

    def mouseReleaseEvent(self, e) -> None:
        if self._drag is not None:
            self._drag = None
            self._save_state()

    def wheelEvent(self, e) -> None:
        step = 0.1 if e.angleDelta().y() > 0 else -0.1
        self._set_scale(self._scale + step)
        self._save_state()

    def contextMenuEvent(self, e) -> None:
        menu = QMenu(self)
        reset = menu.addAction("크기·위치 초기화")
        quit_action = menu.addAction("짱돌 끄기")
        chosen = menu.exec(e.globalPos())
        if chosen == reset:
            self._set_scale(float(self._cfg.get("size", 1.0)))
            self._move_to_corner()
            self._save_state()
        elif chosen == quit_action:
            QApplication.quit()

    # ── 위치·크기 ───────────────────────────────────────

    def _set_scale(self, scale: float) -> None:
        """크기를 바꿔도 돌멩이 바닥 가운데 위치는 그대로."""
        scale = min(2.0, max(0.5, round(scale, 2)))
        old = self.geometry()
        anchor = QPoint(old.x() + old.width() // 2, old.y() + old.height())
        self._scale = scale
        w, h = int(BASE_W * scale), int(BASE_H * scale)
        self.setGeometry(anchor.x() - w // 2, anchor.y() - h, w, h)

    def _move_to_corner(self) -> None:
        screen = QGuiApplication.primaryScreen().availableGeometry()
        corner = self._cfg.get("corner", "bottom-right")
        margin = 16
        x = screen.left() + margin if "left" in corner else screen.right() - self.width() - margin
        y = screen.top() + margin if "top" in corner else screen.bottom() - self.height() - margin
        self.move(x, y)

    def _restore_position(self, saved: dict) -> bool:
        if "x" not in saved or "y" not in saved:
            return False
        center = QPoint(int(saved["x"]) + self.width() // 2, int(saved["y"]) + self.height() // 2)
        if QGuiApplication.screenAt(center) is None:  # 모니터 구성이 바뀌어서 화면 밖이면 무시
            return False
        self.move(int(saved["x"]), int(saved["y"]))
        return True

    def _load_state(self) -> dict:
        try:
            return json.loads(self._state_file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}

    def _save_state(self) -> None:
        try:
            self._state_file.parent.mkdir(parents=True, exist_ok=True)
            data = {"x": self.x(), "y": self.y(), "scale": self._scale}
            self._state_file.write_text(json.dumps(data), encoding="utf-8")
        except OSError:
            pass  # 위치 저장 실패는 치명적이지 않음


def run_overlay(speaker, presence: Presence, cfg: dict) -> None:
    """돌멩이 창을 띄우고, 창을 끄거나 Ctrl+C 할 때까지 여기서 돈다 (메인 스레드에서 호출)."""
    app = QApplication.instance() or QApplication([])
    window = RockOverlay(speaker, presence, cfg)
    window.show()
    # Qt 루프가 도는 동안엔 파이썬이 Ctrl+C를 못 받아서, 타이머로 주기적으로 깨워줌
    signal.signal(signal.SIGINT, lambda *_: app.quit())
    waker = QTimer()
    waker.timeout.connect(lambda: None)
    waker.start(200)
    app.exec()
