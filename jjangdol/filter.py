"""짱돌 출력 필터.

짱돌이 하는 말을 문장 단위로 검사한다. 설정은 config/filter.toml.

    flt = OutputFilter(Path("config/filter.toml"))
    result = flt.check("검사할 문장")
    if not result.allowed:
        print(result.category, result.reason)
"""

from __future__ import annotations

import re
import tomllib
from dataclasses import dataclass
from pathlib import Path

# 띄어쓰기·구두점을 끼워 넣은 변형("자 살", "자.살")을 잡기 위해 지울 문자들
_SEPARATORS = re.compile(r"[\s.,\-_*~!?·…'\"/|]+")


@dataclass(frozen=True)
class FilterResult:
    allowed: bool
    category: str | None = None  # 걸린 카테고리 이름 (예: "self_harm")
    reason: str | None = None    # 어떤 패턴/라벨에 걸렸는지


@dataclass(frozen=True)
class _Rule:
    category: str
    source: str
    regex: re.Pattern[str]


class OutputFilter:
    def __init__(self, config_path: Path):
        with open(config_path, "rb") as f:
            cfg = tomllib.load(f)

        settings = cfg.get("settings", {})
        self.enabled: bool = settings.get("enabled", True)
        self.replacement: str = settings.get("replacement", "")

        self._rules: list[_Rule] = []
        for name, cat in cfg.get("categories", {}).items():
            if not cat.get("enabled", True):
                continue
            for source in cat.get("patterns", []):
                try:
                    regex = re.compile(source, re.IGNORECASE)
                except re.error as e:
                    raise ValueError(
                        f"filter.toml [categories.{name}] 패턴이 잘못됨: {source!r} ({e})"
                    ) from e
                self._rules.append(_Rule(name, source, regex))

        clf = cfg.get("classifier", {})
        self._classifier = (
            _HateClassifier(
                clf["model"],
                clf.get("threshold", 0.5),
                set(clf.get("ignore_labels", [])),
            )
            if self.enabled and clf.get("enabled")
            else None
        )

    def check(self, text: str) -> FilterResult:
        if not self.enabled:
            return FilterResult(True)

        variants = (text, _SEPARATORS.sub("", text))
        for rule in self._rules:
            if any(rule.regex.search(v) for v in variants):
                return FilterResult(False, rule.category, f"패턴 {rule.source!r}")

        if self._classifier is not None:
            label = self._classifier.flagged_label(text)
            if label is not None:
                return FilterResult(False, "hate", f"분류 모델 라벨 {label!r}")

        return FilterResult(True)


class _HateClassifier:
    """선택 기능: 한국어 혐오 표현 분류 모델 (transformers + torch 필요, CPU로 돌림)."""

    def __init__(self, model_name: str, threshold: float, ignore_labels: set[str]):
        try:
            from transformers import pipeline  # 무거워서 켤 때만 불러옴
        except ImportError as e:
            raise RuntimeError(
                "filter.toml에서 classifier를 켰는데 transformers가 없음. "
                "pip install transformers torch 하거나 enabled = false로 두기"
            ) from e
        self._pipe = pipeline(
            "text-classification",
            model=model_name,
            top_k=None,
            function_to_apply="sigmoid",
            device=-1,  # CPU (그래픽카드는 게임 몫)
        )
        self._threshold = threshold
        self._ignore = ignore_labels

    def flagged_label(self, text: str) -> str | None:
        scores = self._pipe([text])[0]
        for item in sorted(scores, key=lambda s: s["score"], reverse=True):
            if item["label"] in self._ignore:
                continue
            if item["score"] >= self._threshold:
                return item["label"]
        return None
