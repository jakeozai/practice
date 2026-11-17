import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { BRAND, contactEmail } from "@/lib/brand";
import { TERMS_EFFECTIVE, TERMS_EXISTING_MEMBERS_FROM, TERMS_VERSION } from "@/lib/terms";

export const metadata = { title: `이용약관 — ${BRAND.name}` };

/**
 * 이용약관 (2026-11-17). Written to the 약관규제법 limits: no clause excludes
 * liability for our own intent or negligence (제7조); the limits only say what
 * we are not the party to (postings, member-client deals). See
 * docs/legal/terms-2026-11-17.md for the reasoning behind each article.
 * Avoid "취업추천·취업지원" wording (직업안정법 시행령 제28조 제3호).
 */
function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-lg font-bold">{children}</h2>;
}

async function Contact() {
  await connection(); // read CONTACT_EMAIL at request time, not at build
  const email = contactEmail();
  return email ? (
    <a href={`mailto:${email}`} className="font-semibold underline underline-offset-2">
      {email}
    </a>
  ) : (
    <span>문의 이메일(서비스 도메인을 연결하면 이곳에 공개해요)</span>
  );
}

const contact = (
  <Suspense fallback={<span>문의 이메일</span>}>
    <Contact />
  </Suspense>
);

export default function TermsPage() {
  const b = BRAND.name;
  return (
    <article className="card leading-relaxed [&_li]:mt-1 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-2xl font-extrabold tracking-tight">{b} 이용약관</h1>
      <p className="text-sm text-muted">
        버전 {TERMS_VERSION} · 시행일 {TERMS_EFFECTIVE}
      </p>

      <div className="mt-6 rounded-2xl border border-[var(--line)] p-4 text-sm">
        <p className="!mt-0 font-bold">한눈에 보기</p>
        <ul>
          <li>
            <strong>{b}이 하는 일:</strong> 공개된 해외 일감 공고를 골라 한국어 요약과 원문 링크를 매일 아침 메일로 보내요. 무료예요.
          </li>
          <li>
            <strong>{b}이 하지 않는 일:</strong> 일을 맡기는 의뢰인 역할, 지원 대행, 계약·대금 중개, 공고가 진짜인지 보증하는 일
          </li>
          <li>
            <strong>사기 의심 공고:</strong> 신고하면 운영자가 확인하고, 사기로 판단하면 모든 회원에게 더 보내지 않아요.
          </li>
          <li>
            <strong>책임:</strong> {b}의 잘못(고의·과실)으로 생긴 손해는 배상해요. 의뢰인이 쓴 공고 내용과 회원·의뢰인 사이의 거래에서
            생긴 손해는 {b}에게 잘못이 없으면 책임지지 않아요.
          </li>
        </ul>
      </div>

      <H2>제1조 (목적)</H2>
      <p>
        이 약관은 {b}이 제공하는 해외 일감 정보 메일 서비스를 이용하는 조건과 절차, {b}과 회원의 권리·의무·책임을 정해요.
      </p>

      <H2>제2조 (용어)</H2>
      <ul>
        <li>
          &quot;서비스&quot;: {b}이 공개된 출처에서 모은 해외 원격 일감 공고를 골라, 한국어 제목·요약과 원문 링크를 매일 아침 이메일로 보내는
          무료 서비스와 이에 딸린 웹사이트예요.
        </li>
        <li>&quot;회원&quot;: 이 약관에 동의하고 이메일 확인을 마쳐 서비스를 이용하는 사람이에요.</li>
        <li>&quot;공고&quot;: 다른 회사나 플랫폼(이하 &quot;공고 출처&quot;)이 인터넷에 공개한 일감 정보예요.</li>
        <li>&quot;의뢰인&quot;: 공고를 내고 일을 맡기려는 회사나 개인이에요.</li>
      </ul>

      <H2>제3조 (약관의 게시와 변경)</H2>
      <ol>
        <li>{b}은 이 약관을 웹사이트에 게시해요.</li>
        <li>
          약관을 바꿀 때는 바뀌는 내용과 시행일을 시행 7일 전부터 웹사이트에 알려요. 회원에게 불리하거나 중요한 변경은 30일 전부터 알리고
          이메일로도 안내해요.
        </li>
        <li>
          알릴 때 &quot;시행일 전까지 거부 의사를 밝히지 않으면 동의한 것으로 본다&quot;는 점을 함께 알렸는데도 회원이 거부 의사를 밝히지
          않으면, 바뀐 약관에 동의한 것으로 봐요. 동의하지 않으면 언제든 해지할 수 있어요.
        </li>
      </ol>

      <H2>제4조 (가입과 이용 자격)</H2>
      <ol>
        <li>이메일 주소를 입력하고, 받은 확인 메일의 링크에서 이 약관에 동의한 뒤 [시작하기]를 누르면 이용 계약이 성립해요.</li>
        <li>만 14세 이상만 가입할 수 있어요. 만 14세 미만이 가입한 사실을 알게 되면 계약을 해지하고 정보를 지체 없이 삭제해요.</li>
        <li>
          공고 대부분은 공고 출처나 의뢰인이 만 18세 이상에게만 지원을 받아요. 나이·거주 국가 같은 지원 자격은 회원이 원문에서 직접 확인해야
          해요.
        </li>
        <li>다른 사람의 이메일 주소로 가입할 수 없어요.</li>
      </ol>

      <H2>제5조 (서비스 내용)</H2>
      <ol>
        <li>{b}은 매일 아침 회원에게 공고를 최대 5개 골라 보내요. 프로필을 저장한 회원에게는 프로필에 맞춰 골라요.</li>
        <li>
          메일의 한국어 제목과 요약은 AI가 원문을 바탕으로 만들어요. 원문과 다를 수 있으니 지원하기 전에 반드시 원문을 확인해 주세요. 요약과
          원문이 다르면 원문이 우선해요.
        </li>
        <li>서비스는 무료예요. {b}은 회원에게 이용료를 받지 않고, 지원이나 계약의 대가로 수수료를 받지 않아요.</li>
        <li>
          조건에 맞는 공고가 적은 날에는 5개보다 적게 보내거나 보내지 않을 수 있어요. 공고 출처, 발송 시각, 공고 수는 운영 상황에 따라 바뀔
          수 있어요.
        </li>
        <li>점검, 장애, 외부 서비스 문제가 있으면 서비스를 잠시 멈출 수 있어요. 미리 알 수 있으면 웹사이트에 먼저 알려요.</li>
        <li>서비스를 끝낼 때는 30일 전에 웹사이트와 이메일로 알려요.</li>
      </ol>

      <H2>제6조 ({b}의 역할)</H2>
      <ol>
        <li>
          {b}은 공개된 공고를 찾아 요약과 링크를 전하는 정보 서비스예요. 의뢰인이 아니며, 회원과 의뢰인 사이의 지원·계약·작업·대금 지급에
          참여하거나 대리하지 않아요.
        </li>
        <li>회원은 원문 페이지에서 직접 지원하고, 계약 조건은 회원과 의뢰인이 정해요(플랫폼 공고는 그 플랫폼의 규칙을 따라요).</li>
        <li>{b}은 회원의 이력서나 연락처를 의뢰인에게 보내지 않아요.</li>
      </ol>

      <H2>제7조 (공고 확인과 사기 의심 공고)</H2>
      <ol>
        <li>
          {b}은 공고를 보내기 전에 다음을 해요.
          <ul>
            <li>회사 채용 페이지, 공개 API, 일감 플랫폼의 공개 페이지처럼 정해 둔 출처에서만 공고를 모아요.</li>
            <li>
              한국에서 지원할 수 없거나, 마감됐거나, 사기 위험 신호(먼저 돈을 내라는 요구, 메신저로만 연락, 지나치게 높은 보수 등)가 보이는
              공고를 자동 규칙과 운영자 검수로 걸러요.
            </li>
            <li>회원이 신고한 공고를 확인해요.</li>
          </ul>
        </li>
        <li>
          그래도 {b}은 모든 공고가 진짜인지, 의뢰인이 누구인지, 보수가 지급될지, 작업 조건이 원문대로 지켜질지를 보증하지 않아요. 공고
          내용에 대한 책임은 공고를 낸 의뢰인과 공고 출처에 있어요.
        </li>
        <li>
          회원은 지원하기 전에 다음을 지켜 주세요.
          <ul>
            <li>등록비·교육비·장비비·보증금처럼 먼저 돈을 내라고 하면 지원하지 마세요. 정상적인 일감은 돈을 먼저 요구하지 않아요.</li>
            <li>텔레그램·왓츠앱·카카오톡 같은 메신저로만 연락하자고 하면 의심하세요.</li>
            <li>
              신분증 사본, 계좌 비밀번호, 인증번호, 카드 정보를 보내지 마세요. 본인 확인이 필요하면 공고 출처의 공식 절차를 이용하세요.
            </li>
            <li>플랫폼 공고라면 플랫폼 밖에서 돈을 주고받지 마세요. 플랫폼의 대금 보호를 받을 수 없어요.</li>
            <li>링크 주소가 공고 출처의 공식 주소인지 확인하세요.</li>
          </ul>
        </li>
        <li>사기가 의심되는 공고는 메일의 [관심 없어요·신고]에서 신고하거나 문의 이메일({contact})로 알려 주세요.</li>
        <li>
          신고를 받으면 운영자가 확인하고, 사기이거나 사기로 의심할 만한 이유가 있으면 그 공고를 모든 회원에게 더 보내지 않아요. 같은
          의뢰인의 다른 공고도 함께 살펴봐요.
        </li>
        <li>
          사기 피해를 본 회원이 수사기관이나 공고 출처에 알릴 때 필요한 자료(받은 공고의 원문 주소, 받은 날짜 등)를 요청하면, 법이 허용하는
          범위에서 제공해요.
        </li>
      </ol>

      <H2>제8조 (책임의 범위)</H2>
      <ol>
        <li>
          {b}은 고의 또는 과실로 회원에게 손해를 끼친 경우 법에 따라 배상해요. 예를 들어 사기로 판단한 공고를 그 뒤에도 계속 보내 생긴 손해,{" "}
          {b}의 관리 잘못으로 회원의 개인정보가 유출돼 생긴 손해는 {b}이 책임져요.
        </li>
        <li>
          다음 손해는 {b}에게 고의 또는 과실이 없으면 책임지지 않아요.
          <ul>
            <li>의뢰인이나 공고 출처가 공고에 쓴 내용(거짓, 과장, 사기 포함)이나 그들의 행동으로 생긴 손해</li>
            <li>회원과 의뢰인 사이의 지원·계약·작업·대금 지급에서 생긴 분쟁과 손해</li>
            <li>공고 출처나 외부 플랫폼의 장애, 정책 변경, 계정 정지로 생긴 손해</li>
            <li>천재지변, 통신망 장애처럼 {b}이 막을 수 없는 사유로 생긴 손해</li>
            <li>회원이 제7조 제3항의 안전 수칙을 지키지 않거나, 메일 속 개인 링크를 다른 사람과 공유해서 생긴 손해</li>
          </ul>
        </li>
        <li>회원과 의뢰인 사이에 분쟁이 생기면 {b}은 당사자가 아니지만, 가진 자료를 제공하는 등 할 수 있는 범위에서 도와요.</li>
      </ol>

      <H2>제9조 (회원의 의무)</H2>
      <ol>
        <li>
          회원은 다음을 하면 안 돼요.
          <ul>
            <li>다른 사람의 이메일 주소로 가입하거나, 메일 속 개인 링크를 다른 사람에게 넘기는 일</li>
            <li>서비스나 메일 내용을 자동으로 수집하거나, 대량으로 다시 배포·판매하는 일</li>
            <li>거짓 신고를 되풀이하거나 서비스 운영을 방해하는 일</li>
          </ul>
        </li>
        <li>공고에 지원할 때는 공고 출처의 이용약관과 의뢰인의 조건을 따라야 해요.</li>
        <li>
          해외 일감으로 받은 소득의 세금 신고와 해외 송금 수령은 회원이 직접 챙겨야 해요(
          <Link href="/guide" className="underline underline-offset-2">
            해외 일감 이용 안내
          </Link>
          참고).
        </li>
      </ol>

      <H2>제10조 (해지와 이용 제한)</H2>
      <ol>
        <li>
          회원은 언제든 메일 맨 아래 [메일 그만 받기]나{" "}
          <Link href="/account" className="underline underline-offset-2">
            내 정보
          </Link>
          에서 해지할 수 있어요. 탈퇴하면 개인정보는 개인정보 처리방침에 따라 삭제해요.
        </li>
        <li>
          회원이 제9조를 어기면 {b}은 이유를 미리 알리고 이용을 제한하거나 계약을 해지할 수 있어요. 다른 회원의 피해를 막아야 할 만큼 급하면
          먼저 조치하고 바로 알려요.
        </li>
      </ol>

      <H2>제11조 (권리의 귀속)</H2>
      <ol>
        <li>한국어 요약, 메일과 웹사이트의 디자인, 로고처럼 {b}이 만든 것의 권리는 {b}에 있어요. 회원은 자신의 일감을 찾는 데만 쓸 수 있어요.</li>
        <li>공고 원문의 권리는 의뢰인과 공고 출처에 있어요.</li>
      </ol>

      <H2>제12조 (개인정보 보호)</H2>
      <p>
        회원의 개인정보는{" "}
        <Link href="/privacy" className="font-semibold underline underline-offset-2">
          개인정보 처리방침
        </Link>
        에 따라 처리해요.
      </p>

      <H2>제13조 (광고)</H2>
      <p>지금 메일에는 광고가 없어요. 앞으로 광고성 정보를 보낼 때는 법에 따라 따로 수신 동의를 받아요.</p>

      <H2>제14조 (준거법과 분쟁 해결)</H2>
      <ol>
        <li>이 약관은 대한민국 법에 따라 해석해요.</li>
        <li>분쟁이 생기면 먼저 문의 이메일로 협의해요. 소송은 민사소송법에 따른 관할 법원에서 해요.</li>
      </ol>

      <H2>부칙</H2>
      <ol>
        <li>이 약관은 {TERMS_EFFECTIVE}부터 시행해요.</li>
        <li>이 약관 시행 전에 가입한 회원에게는 {TERMS_EXISTING_MEMBERS_FROM}부터 적용해요.</li>
      </ol>
    </article>
  );
}
