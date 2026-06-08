import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  await transporter.sendMail({
    from: `"WorldSquad" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  })
}

export function welcomeEmailHtml(pseudo: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#111118 0%,#1a1a2e 100%);padding:40px 32px 32px;text-align:center;border-bottom:2px solid #F5C518;">
      <h1 style="margin:0;font-size:32px;font-weight:900;letter-spacing:2px;color:#fff;">
        WORLD<span style="color:#F5C518;">SQUAD</span>
      </h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.4);font-size:13px;letter-spacing:1px;">COUPE DU MONDE 2026</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;color:#fff;font-size:22px;">Bienvenue, ${pseudo} !</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;margin:0 0 24px;">
        Ton compte WorldSquad est prêt. Tu peux maintenant pronostiquer les matchs, collecter des cartes et défier tes amis.
      </p>

      <!-- Reward box -->
      <div style="background:rgba(245,197,24,0.08);border:1px solid rgba(245,197,24,0.25);border-radius:12px;padding:20px;margin-bottom:28px;">
        <p style="margin:0 0 4px;color:#F5C518;font-weight:700;font-size:14px;letter-spacing:1px;">🎁 RÉCOMPENSE D'INSCRIPTION</p>
        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px;">500 SquadCoins crédités sur ton compte</p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard"
           style="display:inline-block;background:#F5C518;color:#0A0A0F;font-weight:900;font-size:15px;letter-spacing:1px;padding:14px 36px;border-radius:10px;text-decoration:none;">
          ACCÉDER AU DASHBOARD →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
      <p style="margin:0;color:rgba(255,255,255,0.2);font-size:12px;">
        WorldSquad · Coupe du Monde 2026
      </p>
    </div>
  </div>
</body>
</html>
`
}

export function passwordResetEmailHtml(resetLink: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#111118 0%,#1a1a2e 100%);padding:40px 32px 32px;text-align:center;border-bottom:2px solid #F5C518;">
      <h1 style="margin:0;font-size:32px;font-weight:900;letter-spacing:2px;color:#fff;">
        WORLD<span style="color:#F5C518;">SQUAD</span>
      </h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;color:#fff;font-size:20px;">Réinitialisation du mot de passe</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;margin:0 0 28px;">
        Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien expire dans 1 heure.
      </p>
      <div style="text-align:center;">
        <a href="${resetLink}"
           style="display:inline-block;background:#F5C518;color:#0A0A0F;font-weight:900;font-size:15px;letter-spacing:1px;padding:14px 36px;border-radius:10px;text-decoration:none;">
          RÉINITIALISER →
        </a>
      </div>
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:24px 0 0;text-align:center;">
        Si tu n'as pas demandé de réinitialisation, ignore cet email.
      </p>
    </div>
  </div>
</body>
</html>
`
}
