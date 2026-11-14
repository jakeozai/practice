import { Suspense } from "react";
import { connection } from "next/server";
import { BRAND, contactEmail } from "@/lib/brand";

export const metadata = { title: `개인정보 처리방침 — ${BRAND.name}` };

/**
 * 개인정보 처리방침 (개인정보 보호법 제30조, 시행령 제31조).
 * Based on docs/legal/privacy-research-2026-11-09.md. Update this page and the
 * history table whenever vendors, items or purposes change (e.g. OpenAI
 * embeddings in Phase 2, the English application draft, referral rewards).
 */
const POLICY_VERSION = { version: "1.0", effective: "2026년 11월 9일" };

const VENDORS = [
  {
    name: "Supabase, Inc.",
    contact: "privacy@supabase.com",
    work: "데이터베이스 보관, 이메일 로그인(인증) 처리",
    country: "대한민국(서울 리전)에 저장. 운영·장애 대응 과정에서 미국 등에서 접근될 수 있음",
    when: "가입·이용할 때 수시로, 암호화된 네트워크로 전송",
    items: "회원 정보, 프로필, 메일 서비스 기록, 로그인 기록",
    period: "탈퇴 시 또는 위탁 계약 종료 시까지",
  },
  {
    name: "Vercel Inc.",
    contact: "privacy@vercel.com",
    work: "웹사이트·서버 기능 운영(서울 리전), 매일 수집·발송 작업 실행",
    country: "대한민국(서울 리전)에서 처리. 접속 기록과 운영 지원은 미국에서 처리될 수 있음",
    when: "웹사이트에 접속하거나 매일 발송 작업이 실행될 때, 암호화된 네트워크로 전송",
    items: "접속 기록(IP 주소, 브라우저 정보, 요청 주소·시각), 처리 과정에서 일시적으로 다루는 이메일·프로필 항목",
    period: "요청 처리 즉시 삭제. 접속 기록은 Vercel의 로그 보관 기간이 지나면 자동 삭제",
  },
  {
    name: "Plus Five Five, Inc. (Resend)",
    contact: "support@resend.com",
    work: "로그인 메일과 일일 메일 발송, 반송·스팸 신고 처리",
    country: "미국",
    when: "메일을 보낼 때, 암호화된 네트워크로 전송",
    items: "이메일 주소, 메일 본문(추천 공고, 수신거부·프로필 링크), 발송 결과",
    period: "발송 후 Resend의 기록 보관 기간이 지나면 삭제",
  },
] as const;

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-lg font-bold">{children}</h2>;
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border-b border-[var(--line)] px-2 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) => (
                <td key={j} className="border-b border-[var(--line)] px-2 py-2 text-[var(--ink)]">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Contact() {
  await connection(); // read CONTACT_EMAIL at request time, not at build
  const email = contactEmail();
  return email ? (
    <a href={`mailto:${email}`} className="font-semibold underline underline-offset-2">
      {email}
    </a>
  ) : (
    <span>시범 운영 중이라 서비스 도메인을 연결하면 이곳에 문의 이메일을 공개해요</span>
  );
}

const contact = (
  <Suspense fallback={<span>문의 이메일</span>}>
    <Contact />
  </Suspense>
);

export default function PrivacyPage() {
  const b = BRAND.name;
  return (
    <article className="card leading-relaxed [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-2xl font-extrabold tracking-tight">{b} 개인정보 처리방침</h1>
      <p className="text-sm text-muted">
        버전 {POLICY_VERSION.version} · 시행일 {POLICY_VERSION.effective}
      </p>
      <p>
        {b}은 1인이 운영하는 무료 서비스예요. {b}은 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 관련 고충을 빠르게 처리하기
        위해 이 개인정보 처리방침을 정해 공개합니다.
      </p>

      <H2>한눈에 보기</H2>
      <Table
        head={["구분", "내용"]}
        rows={[
          ["처리하는 정보", "이메일 주소, (선택) 프로필 항목, 메일·서비스 이용 기록"],
          ["처리 목적", "매일 아침 일감 메일 발송, 맞춤 추천, 문의 응대"],
          ["처리 근거", "서비스 이용계약 이행 등 (동의를 근거로 처리하는 정보 없음)"],
          ["보유 기간", "탈퇴할 때까지 (일부 기록은 1일~3개월)"],
          ["제3자 제공", "하지 않음"],
          ["처리 위탁·국외 이전", "Supabase, Vercel, Resend (모두 미국 기업)"],
          ["문의", contact],
        ]}
      />

      <H2>1. 개인정보의 처리 목적</H2>
      <p>{b}은 다음 목적으로만 개인정보를 처리해요. 목적이 바뀌면 법에 따라 미리 알리고 필요한 조치를 할게요.</p>
      <ul>
        <li>가입과 로그인: 이메일로 보내는 로그인 링크로 본인을 확인하고 회원을 관리해요.</li>
        <li>일일 메일 서비스: 매일 아침 일감을 보내고, 같은 공고를 다시 보내지 않도록 관리하며, 수신거부와 반송을 처리해요.</li>
        <li>맞춤 추천(프로필을 저장한 경우): 프로필과 일감을 비교해 추천해요.</li>
        <li>서비스 개선: 클릭 수 같은 통계를 개인을 알아볼 수 없는 형태로 집계해요.</li>
        <li>보안과 문의 응대: 부정 이용을 막고 문의·권리행사 요청에 답해요.</li>
      </ul>

      <H2>2. 처리하는 개인정보 항목과 처리 근거</H2>
      <p>
        {b}은 동의를 근거로 처리하는 개인정보가 없어요. 아래 정보는 모두 「개인정보 보호법」(이하 &quot;법&quot;) 제15조 제1항에 따라 동의
        없이 처리할 수 있는 정보이며, 법 제22조 제3항에 따라 항목과 법적 근거를 알려 드려요.
      </p>
      <Table
        head={["구분", "항목", "수집 방법", "처리 근거"]}
        rows={[
          ["회원 정보", "이메일 주소, 회원 식별번호, 가입·인증 일시", "가입할 때 직접 입력", "법 제15조 제1항 제4호(서비스 이용계약 이행)"],
          [
            "메일 서비스 기록",
            "보낸 공고와 발송 일시·순서, 메일 속 링크를 누른 일시, 발송 결과(전달·반송·스팸 신고), 수신 상태",
            "서비스 이용 중 생성",
            "법 제15조 제1항 제4호",
          ],
          [
            "프로필(선택)",
            "잘하는 분야, 사용하는 도구, 사용 언어·영어 수준, 주당 가능 시간, 희망 시급(USD), 피하고 싶은 일, 짧은 경력 요약",
            "이용자가 자신의 AI 분석 결과를 붙여넣고 확인한 뒤 저장",
            "법 제15조 제1항 제4호(이용자가 요청한 맞춤 추천)",
          ],
          [
            "접속·보안 기록",
            "로그인 기록(일시, IP 주소, 브라우저 정보), 로그인 메일 요청 기록(이메일·IP를 알아볼 수 없게 변환한 값), 웹사이트 접속 기록",
            "자동 생성",
            "법 제15조 제1항 제6호(보안·부정 이용 방지)",
          ],
          ["문의", "이메일 주소, 문의·요청 내용", "이메일로 받음", "법 제15조 제1항 제4호(권리행사 요청은 제2호)"],
        ]}
      />
      <ul>
        <li>붙여넣은 AI 분석 결과 원문은 저장하지 않아요. 서버에서 위 프로필 항목만 뽑아낸 뒤 원문은 바로 버리고, 이용자가 확인한 항목만 저장해요.</li>
        <li>
          {b}은 이용자의 ChatGPT·Claude·Gemini 계정이나 대화 기록에 접근하지 않아요. 이용자가 자신의 AI에게 분석을 요청하는 것은 이용자와
          해당 AI 서비스 사이의 일이며, 그 서비스의 개인정보 처리방침이 적용돼요.
        </li>
        <li>프로필에 건강·종교·정치적 견해 같은 민감한 정보나 주민등록번호를 넣지 마세요. 들어온 것을 알게 되면 바로 삭제해요.</li>
        <li>{b}은 이름, 전화번호, 주소, 주민등록번호, 결제 정보를 받지 않아요.</li>
      </ul>

      <H2>3. 개인정보의 처리 및 보유 기간</H2>
      <Table
        head={["항목", "보유 기간"]}
        rows={[
          ["회원 정보, 메일 서비스 기록, 수신 상태", "회원 탈퇴 시까지 (탈퇴하면 지체 없이 삭제)"],
          ["프로필", "이용자가 프로필을 지우거나 탈퇴할 때까지"],
          ["로그인 메일 요청 기록", "1일"],
          ["로그인 기록(IP 주소 등)", "인증 사업자(Supabase)의 보관 기간에 따름, 탈퇴 시 함께 삭제"],
          ["웹사이트 접속 기록", "호스팅 사업자(Vercel)의 로그 보관 기간이 지나면 자동 삭제"],
          ["문의·권리행사 기록", "처리 완료 후 1년"],
        ]}
      />
      <p>법령에 따라 따로 보존하는 개인정보는 현재 없어요.</p>

      <H2>4. 개인정보의 파기 절차 및 방법</H2>
      <ul>
        <li>보유 기간이 지나거나 처리 목적을 이루면 지체 없이 파기해요. 탈퇴와 기간 경과에 따른 삭제는 자동으로 처리해요.</li>
        <li>전자 파일은 복구할 수 없는 방법으로 영구 삭제해요. 백업에 남은 정보는 백업 보관 주기가 끝나면 함께 지워져요.</li>
        <li>{b}은 개인정보를 종이로 출력하거나 보관하지 않아요.</li>
      </ul>

      <H2>5. 개인정보의 제3자 제공</H2>
      <p>
        {b}은 이용자의 개인정보를 제3자에게 제공하지 않아요. 일감 지원은 이용자가 원문 공고 사이트에서 직접 하며, {b}은 지원서를 대신
        내거나 회원 정보를 채용사·플랫폼에 넘기지 않아요. 메일 링크로 이동한 원문 공고 사이트에서는 그 사이트의 개인정보 처리방침이
        적용돼요.
      </p>

      <H2>6. 개인정보 처리의 위탁</H2>
      <Table head={["수탁자", "위탁 업무"]} rows={VENDORS.map((v) => [v.name, v.work])} />
      <ul>
        <li>
          수탁자는 클라우드 인프라 등 일부 업무를 다시 위탁할 수 있어요(예: Supabase는 Amazon Web Services 서울 리전 이용). 재수탁자는
          각 수탁자가 공개하는 하위 처리자(sub-processor) 목록에서 확인할 수 있고, 요청하면 안내해 드려요.
        </li>
        <li>
          법 제26조에 따라 목적 외 처리 금지, 안전조치, 재위탁 제한, 관리·감독, 손해배상 책임을 정한 문서(각 사의 데이터 처리 부속서)로
          위탁하고, 수탁자가 개인정보를 안전하게 처리하는지 감독해요.
        </li>
      </ul>

      <H2>7. 개인정보의 국외 이전</H2>
      <p>법 제28조의8 제1항 제3호에 따라, 서비스 이용계약의 체결과 이행에 필요한 처리위탁·보관을 위해 다음과 같이 개인정보를 국외로 이전해요.</p>
      <Table
        head={["이전받는 자(연락처)", "이전 국가", "이전 시기와 방법", "이전 항목", "이용 목적", "보유·이용 기간"]}
        rows={VENDORS.map((v) => [`${v.name} (${v.contact})`, v.country, v.when, v.items, v.work, v.period])}
      />
      <ul>
        <li>
          거부 방법과 효과: 국외 이전을 원하지 않으면 탈퇴하거나 문의 이메일로 요청하세요. 위 사업자 없이는 서비스를 제공할 수 없어 탈퇴 외의
          방법으로 거부하기는 어려워요.
        </li>
        <li>보호조치: 각 사업자와 개인정보 보호 조항이 담긴 계약을 맺고, 전송 구간을 암호화하며, 꼭 필요한 항목만 이전해요.</li>
      </ul>

      <H2>8. 개인정보의 안전성 확보조치</H2>
      <ul>
        <li>관리적 조치: 개인정보는 운영자 1인만 다루며, 내부 관리계획을 세워 정기적으로 점검해요.</li>
        <li>
          기술적 조치: 데이터베이스에 행 단위 접근 통제를 적용해 이용자는 자신의 정보만 볼 수 있어요. 모든 통신은 HTTPS로 암호화해요.
          비밀번호 없이 이메일 링크로 로그인하므로 비밀번호를 저장하지 않아요. 메일 속 링크에는 위조할 수 없는 서명 토큰을 써요.
        </li>
        <li>물리적 조치: 자체 서버를 두지 않고, 보안 인증을 갖춘 클라우드 사업자의 데이터센터를 이용해요.</li>
      </ul>

      <H2>9. 쿠키 등 자동 수집 장치</H2>
      <ul>
        <li>로그인 유지용 쿠키만 사용해요. 광고·분석용 쿠키나 추적 도구는 쓰지 않아요.</li>
        <li>브라우저 설정에서 쿠키를 차단할 수 있어요. 차단하면 로그인이 필요한 기능(프로필 저장 등)을 쓸 수 없지만 메일은 그대로 받을 수 있어요.</li>
        <li>메일에는 열람 여부를 추적하는 이미지(픽셀)를 넣지 않아요. 메일 속 링크는 {b} 주소를 거쳐 원문 공고로 이동하며, 이때 누른 일시를 기록해요.</li>
      </ul>

      <H2>10. 추천 방식과 AI 이용 안내</H2>
      <ul>
        <li>{b}의 추천은 이용자가 지원 여부를 스스로 정하도록 돕는 정보 제공이며, 이용자의 권리나 의무를 결정하지 않아요.</li>
        <li>지금은 모든 회원에게 같은 기준(새로 올라온 순, 보수가 높은 순)으로 고른 일감을 보내요.</li>
        <li>
          공고를 한국어로 요약할 때 AI(Anthropic, Vercel AI Gateway 경유)를 쓰지만, 공개된 공고만 전달하고 회원 정보는 전달하지 않아요. 이용자의
          개인정보를 AI 모델 학습에 쓰지 않아요.
        </li>
      </ul>

      <H2>11. 그 밖에 처리하지 않는 정보</H2>
      <p>민감정보·고유식별정보, 가명정보, 당초 목적 외의 추가적인 이용·제공, 영상정보처리기기 운영은 하지 않아요.</p>

      <H2>12. 만 14세 미만 아동의 개인정보</H2>
      <p>{b}은 성인을 위한 서비스로, 만 14세 미만은 가입할 수 없어요. 가입한 사실을 알게 되면 지체 없이 삭제해요.</p>

      <H2>13. 정보주체의 권리와 행사 방법</H2>
      <ul>
        <li>이용자는 언제든 자신의 개인정보 열람(법 제35조), 정정·삭제(법 제36조), 처리정지(법 제37조)를 요구할 수 있어요.</li>
        <li>
          직접 할 수 있는 것: <a href="/account" className="underline underline-offset-2">내 정보</a>에서 메일 그만 받기와 탈퇴(모든 정보
          삭제), <a href="/onboarding" className="underline underline-offset-2">분석 결과</a>에서 프로필 확인·수정, 메일 하단 [메일 그만
          받기]로 바로 수신거부.
        </li>
        <li>이메일로 요청하기: 가입한 이메일 주소에서 문의 이메일로 보내 주세요. 받은 날부터 10일 안에 조치하고 결과를 알려 드려요.</li>
        <li>법정대리인이나 위임을 받은 사람도 요청할 수 있어요. 이때는 개인정보보호위원회 고시 서식의 위임장을 함께 보내 주세요.</li>
        <li>법률에 따라 제한되거나 다른 사람의 이익을 부당하게 침해할 우려가 있으면 요청을 제한할 수 있고, 이때는 이유를 알려 드려요.</li>
      </ul>

      <H2>14. 개인정보 보호책임자와 고충처리</H2>
      <p>{b}은 1인이 운영하는 서비스로, 운영자가 개인정보 보호책임자와 고충처리 담당을 함께 맡아요.</p>
      <ul>
        <li>개인정보 보호책임자: {b} 운영자</li>
        <li>연락처: {contact}</li>
      </ul>

      <H2>15. 권익침해 구제방법</H2>
      <ul>
        <li>개인정보분쟁조정위원회: 1833-6972, www.kopico.go.kr</li>
        <li>개인정보침해신고센터(한국인터넷진흥원): 국번 없이 118, privacy.kisa.or.kr</li>
        <li>대검찰청: 국번 없이 1301, www.spo.go.kr</li>
        <li>경찰청: 국번 없이 182, ecrm.police.go.kr</li>
      </ul>

      <H2>16. 개인정보 처리방침의 변경</H2>
      <p>
        내용을 바꾸면 시행 7일 전에 이 페이지에 알려요. 수집 항목, 이용 목적, 위탁·국외 이전처럼 중요한 변경은 시행 30일 전에 알리고 메일로도
        안내해요.
      </p>
      <Table head={["버전", "시행일", "주요 내용"]} rows={[[POLICY_VERSION.version, POLICY_VERSION.effective, "최초 제정"]]} />
    </article>
  );
}
