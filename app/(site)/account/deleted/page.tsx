export const metadata = { title: "탈퇴 완료 — 덕잡", robots: { index: false } };

export default function DeletedPage() {
  return (
    <div className="card">
      <p className="text-lg font-bold">탈퇴했어요</p>
      <p className="mt-1 text-sm text-muted">이메일과 분석 결과, 받은 메일 기록을 모두 지웠어요. 그동안 고마웠어요.</p>
    </div>
  );
}
