<?php
/**
 * Reciners Informàtica — enviament del formulari de contacte.
 *
 * Rep el formulari del web, el valida i l'envia per correu a admin@reciners.com.
 * No desa cap missatge al servidor. Protecció contra l'abús:
 *  - camp parany ocult (bots), temps mínim d'emplenament,
 *  - límit de 5 enviaments per hora per IP (només es guarda un hash de l'IP, 1 hora),
 *  - comprovació de l'origen de la petició i neteja de capçaleres (sense injecció).
 *
 * Configuració: canvia TO i FROM si cal. FROM ha de ser una adreça del vostre
 * domini (p. ex. web@reciners.com) perquè el correu no acabi a la carpeta de brossa.
 */
declare(strict_types=1);

const TO          = 'admin@reciners.com';
const FROM        = 'web@reciners.com';
const FROM_NAME   = 'Web Reciners';
const MAX_PER_HOUR = 5;
const MIN_SECONDS = 3;

date_default_timezone_set('Europe/Madrid');

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
$lang = in_array($_POST['idioma'] ?? '', ['ca', 'es', 'en'], true) ? $_POST['idioma'] : 'ca';

function reply(bool $ok, string $code, int $http = 200): void {
    global $wantsJson, $lang;
    http_response_code($http);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'error' => $ok ? null : $code]);
        exit;
    }
    $txt = [
        'ca' => [true => 'Gràcies! Hem rebut el teu missatge i et respondrem aviat.', false => 'No s’ha pogut enviar el missatge. Truca’ns al 972 576 055 o escriu-nos a admin@reciners.com.'],
        'es' => [true => '¡Gracias! Hemos recibido tu mensaje y te responderemos pronto.', false => 'No se ha podido enviar el mensaje. Llámanos al 972 576 055 o escríbenos a admin@reciners.com.'],
        'en' => [true => 'Thank you! We have received your message and will reply soon.', false => 'Your message could not be sent. Call us on 972 576 055 or email admin@reciners.com.'],
    ];
    $back = $lang === 'ca' ? '/' : '/' . $lang . '/';
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="' . $lang . '"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reciners</title>'
       . '<body style="font:18px/1.6 system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 20px;color:#0c1a12">'
       . '<p>' . htmlspecialchars($txt[$lang][$ok]) . '</p><p><a href="' . $back . '#contacte">← reciners.com</a></p></body></html>';
    exit;
}

// 1. Només POST
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    reply(false, 'method', 405);
}

// 2. La petició ha de venir del mateix web
$host = strtolower(preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $h) {
    if (!empty($_SERVER[$h])) {
        $from = strtolower((string) parse_url($_SERVER[$h], PHP_URL_HOST));
        if ($from !== '' && $from !== $host) reply(false, 'origin', 403);
    }
}

// 3. Parany per a bots i temps mínim: es responen com si tot anés bé
if (trim((string) ($_POST['web'] ?? '')) !== '') reply(true, '');
$t = (int) ($_POST['t'] ?? 0);
if ($t > 0 && (microtime(true) * 1000 - $t) < MIN_SECONDS * 1000) reply(true, '');

// 4. Límit d'enviaments per IP (hash, es conserva una hora)
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$file = sys_get_temp_dir() . '/rc_form_' . hash('sha256', $ip . '|' . __FILE__);
$now = time();
$hits = [];
if (is_file($file)) {
    $hits = array_filter(array_map('intval', explode(',', (string) file_get_contents($file))), fn($x) => $x > $now - 3600);
}
if (count($hits) >= MAX_PER_HOUR) reply(false, 'rate', 429);

// 5. Validació
$clean = function (string $k, int $max, bool $multiline = false): string {
    $v = trim((string) ($_POST[$k] ?? ''));
    $v = $multiline ? preg_replace('/[^\P{C}\n\t]/u', '', str_replace("\r\n", "\n", $v)) : preg_replace('/\p{C}+/u', ' ', $v);
    return mb_substr((string) $v, 0, $max);
};
$nom = $clean('nom', 100);
$contacte = $clean('contacte', 150);
$missatge = $clean('missatge', 5000, true);
$privacitat = ($_POST['privacitat'] ?? '') === '1';

if (mb_strlen($nom) < 2 || mb_strlen($contacte) < 5 || mb_strlen($missatge) < 10 || !$privacitat) {
    reply(false, 'invalid', 422);
}

// 6. Correu
$isEmail = filter_var($contacte, FILTER_VALIDATE_EMAIL) !== false;
$enc = fn(string $s): string => '=?UTF-8?B?' . base64_encode($s) . '?=';
$subject = $enc('Consulta web: ' . $nom);
$body = "Nou missatge des del formulari de reciners.com\n"
      . "------------------------------------------------\n"
      . "Nom: {$nom}\n"
      . "Contacte: {$contacte}\n"
      . "Idioma: {$lang}\n"
      . "Data: " . date('d/m/Y H:i') . "\n"
      . "Ha acceptat la política de privacitat: sí\n\n"
      . "Missatge:\n{$missatge}\n";
$headers = [
    'From' => $enc(FROM_NAME) . ' <' . FROM . '>',
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => '8bit',
    'X-Mailer' => 'reciners-web',
];
if ($isEmail) $headers['Reply-To'] = $contacte; // validada: no conté salts de línia

$sent = @mail(TO, $subject, $body, $headers, '-f' . FROM);
if (!$sent) reply(false, 'mail', 500);

$hits[] = $now;
@file_put_contents($file, implode(',', $hits), LOCK_EX);
reply(true, '');
