<?php
header('Content-Type: application/json; charset=utf-8');

// Kleine Helferfunktion für HTML-Escaping
function e(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// Honeypot gegen Spam
if (!empty($_POST['_gotcha'] ?? '')) {
    echo json_encode(['success' => true, 'spam' => true]);
    exit;
}

/* ==========
   Grunddaten
   ========== */

$name    = trim($_POST['name']    ?? '');
$email   = trim($_POST['email']   ?? '');
$phone   = trim($_POST['phone']   ?? '');
$message = trim($_POST['message'] ?? '');

$service          = trim($_POST['service']           ?? '');
$selectedService  = trim($_POST['selected_service']  ?? '');
$deadline         = trim($_POST['deadline']          ?? '');
$budget           = trim($_POST['budget']            ?? '');
$summary          = trim($_POST['summary_plain']     ?? '');

$subject = trim($_POST['_subject'] ?? 'Neue Projektanfrage');

/* ==========
   Webdesign
   ========== */

$webMaterial   = trim($_POST['web_material']    ?? '');
$webStyleguide = trim($_POST['web_styleguide']  ?? '');
$webTyp        = trim($_POST['web_typ']         ?? '');
$webPrios      = $_POST['web_prios'] ?? [];
if (!is_array($webPrios)) $webPrios = [$webPrios];

/* ==========
   3D-Design
   ========== */

$d3Typ   = trim($_POST['d3_typ']   ?? '');
$d3Use   = trim($_POST['d3_use']   ?? '');
$d3Daten = trim($_POST['d3_daten'] ?? '');

/* ==========
   Grafikdesign
   ========== */

$gfxStyleguide = trim($_POST['gfx_styleguide'] ?? '');
$gfxMaterial   = trim($_POST['gfx_material']   ?? '');
$gfxTyp        = trim($_POST['gfx_typ']        ?? '');
$gfxPrios      = $_POST['gfx_prios'] ?? [];
if (!is_array($gfxPrios)) $gfxPrios = [$gfxPrios];

/* ==========
   Meta
   ========== */

$referrer  = trim($_POST['_referrer']  ?? '');
$userAgent = trim($_POST['_userAgent'] ?? '');
$origin    = trim($_POST['_origin']    ?? '');

/* ==========
   Pflichtfelder prüfen
   ========== */

if ($name === '' || $email === '' || $message === '') {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'error'   => 'Pflichtfelder fehlen.'
    ]);
    exit;
}

/* ==========
   Schöner, strukturierter Text (für Log)
   ========== */

$bodyText  = "Neue Projektanfrage über das Kontaktformular\n\n";
$bodyText .= "KONTAKT\n";
$bodyText .= "  Name:    {$name}\n";
$bodyText .= "  E-Mail:  {$email}\n";
$bodyText .= "  Telefon: " . ($phone !== '' ? $phone : '–') . "\n\n";

$bodyText .= "PROJEKTÜBERSICHT\n";
$bodyText .= "  Leistung:       " . ($service ?: '–') . "\n";
$bodyText .= "  Service-ID:     " . ($selectedService ?: '–') . "\n";
$bodyText .= "  Deadline:       " . ($deadline ?: '–') . "\n";
$bodyText .= "  Budget:         " . ($budget ?: '–') . "\n\n";

if ($summary !== '') {
    $bodyText .= "Kurzbeschreibung:\n  {$summary}\n\n";
}

if ($service === 'Webdesign') {
    $bodyText .= "WEBDESIGN-DETAILS\n";
    $bodyText .= "  Material:   " . ($webMaterial   ?: '–') . "\n";
    $bodyText .= "  Styleguide: " . ($webStyleguide ?: '–') . "\n";
    $bodyText .= "  Seitentyp:  " . ($webTyp        ?: '–') . "\n";
    $bodyText .= "  Prio:       " . (count($webPrios) ? implode(', ', $webPrios) : '–') . "\n\n";
}

if ($service === '3D-Design') {
    $bodyText .= "3D-DESIGN-DETAILS\n";
    $bodyText .= "  Typ:        " . ($d3Typ   ?: '–') . "\n";
    $bodyText .= "  Einsatzzweck: " . ($d3Use   ?: '–') . "\n";
    $bodyText .= "  Daten:      " . ($d3Daten ?: '–') . "\n\n";
}

if ($service === 'Grafikdesign') {
    $bodyText .= "GRAFIKDESIGN-DETAILS\n";
    $bodyText .= "  Styleguide: " . ($gfxStyleguide ?: '–') . "\n";
    $bodyText .= "  Material:   " . ($gfxMaterial   ?: '–') . "\n";
    $bodyText .= "  Typ:        " . ($gfxTyp        ?: '–') . "\n";
    $bodyText .= "  Schwerpunkte: " . (count($gfxPrios) ? implode(', ', $gfxPrios) : '–') . "\n\n";
}

$bodyText .= "NACHRICHT\n";
$bodyText .= $message . "\n\n";

$bodyText .= "TECHNIK\n";
$bodyText .= "  Referrer:   " . ($referrer ?: '–') . "\n";
$bodyText .= "  User-Agent: " . ($userAgent ?: '–') . "\n";
$bodyText .= "  Origin:     " . ($origin ?: '–') . "\n";

/* ==========
   HTML-Mail aufbauen (schön formatiert)
   ========== */

$bodyHtml  = '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">';
$bodyHtml .= '<title>' . e($subject) . '</title></head><body style="font-family: Arial, sans-serif; color:#222; line-height:1.5;">';

$bodyHtml .= '<h2 style="margin-bottom:4px;">Neue Projektanfrage</h2>';
$bodyHtml .= '<p style="margin-top:0;">Es wurde eine neue Anfrage über das Kontaktformular auf deiner Website gesendet.</p>';

$bodyHtml .= '<h3 style="margin-top:24px;">Kontakt</h3>';
$bodyHtml .= '<table cellspacing="0" cellpadding="4" style="border-collapse:collapse;">';
$bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Name:</td><td>' . e($name) . '</td></tr>';
$bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">E-Mail:</td><td>' . e($email) . '</td></tr>';
$bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Telefon:</td><td>' . ($phone !== '' ? e($phone) : '–') . '</td></tr>';
$bodyHtml .= '</table>';

$bodyHtml .= '<h3 style="margin-top:24px;">Projektübersicht</h3>';
$bodyHtml .= '<table cellspacing="0" cellpadding="4" style="border-collapse:collapse;">';
$bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Leistung:</td><td>' . ($service !== '' ? e($service) : '–') . '</td></tr>';
$bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Service-ID:</td><td>' . ($selectedService !== '' ? e($selectedService) : '–') . '</td></tr>';
$bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Deadline:</td><td>' . ($deadline !== '' ? e($deadline) : '–') . '</td></tr>';
$bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Budgetrahmen:</td><td>' . ($budget !== '' ? e($budget) : '–') . '</td></tr>';
$bodyHtml .= '</table>';

if ($summary !== '') {
    $bodyHtml .= '<h3 style="margin-top:24px;">Kurzbeschreibung</h3>';
    $bodyHtml .= '<p>' . nl2br(e($summary)) . '</p>';
}

// Details je nach Service
if ($service === 'Webdesign') {
    $bodyHtml .= '<h3 style="margin-top:24px;">Details – Webdesign</h3>';
    $bodyHtml .= '<table cellspacing="0" cellpadding="4" style="border-collapse:collapse;">';
    $bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Material:</td><td>' . ($webMaterial !== '' ? e($webMaterial) : '–') . '</td></tr>';
    $bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Styleguide / CI:</td><td>' . ($webStyleguide !== '' ? e($webStyleguide) : '–') . '</td></tr>';
    $bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Seitentyp / Umfang:</td><td>' . ($webTyp !== '' ? e($webTyp) : '–') . '</td></tr>';
    $bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Prioritäten:</td><td>' . (count($webPrios) ? e(implode(', ', $webPrios)) : '–') . '</td></tr>';
    $bodyHtml .= '</table>';
}

if ($service === '3D-Design') {
    $bodyHtml .= '<h3 style="margin-top:24px;">Details – 3D-Design</h3>';
    $bodyHtml .= '<table cellspacing="0" cellpadding="4" style="border-collapse:collapse;">';
    $bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">3D-Typ:</td><td>' . ($d3Typ !== '' ? e($d3Typ) : '–') . '</td></tr>';
    $bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Einsatzzweck:</td><td>' . ($d3Use !== '' ? e($d3Use) : '–') . '</td></tr>';
    $bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Vorhandene Daten:</td><td>' . ($d3Daten !== '' ? e($d3Daten) : '–') . '</td></tr>';
    $bodyHtml .= '</table>';
}

if ($service === 'Grafikdesign') {
    $bodyHtml .= '<h3 style="margin-top:24px;">Details – Grafikdesign</h3>';
    $bodyHtml .= '<table cellspacing="0" cellpadding="4" style="border-collapse:collapse;">';
    $bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Branding / Styleguide:</td><td>' . ($gfxStyleguide !== '' ? e($gfxStyleguide) : '–') . '</td></tr>';
    $bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Material:</td><td>' . ($gfxMaterial !== '' ? e($gfxMaterial) : '–') . '</td></tr>';
    $bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Design-Typ:</td><td>' . ($gfxTyp !== '' ? e($gfxTyp) : '–') . '</td></tr>';
    $bodyHtml .= '<tr><td style="font-weight:bold; padding-right:8px;">Schwerpunkte:</td><td>' . (count($gfxPrios) ? e(implode(', ', $gfxPrios)) : '–') . '</td></tr>';
    $bodyHtml .= '</table>';
}

$bodyHtml .= '<h3 style="margin-top:24px;">Nachricht</h3>';
$bodyHtml .= '<p style="white-space:pre-line;">' . e($message) . '</p>';

$bodyHtml .= '<hr style="margin-top:32px; margin-bottom:16px;">';
$bodyHtml .= '<p style="font-size:12px; color:#666; margin-top:0;">';
$bodyHtml .= '<strong>Technische Infos:</strong><br>';
$bodyHtml .= 'Referrer: ' . ($referrer !== '' ? e($referrer) : '–') . '<br>';
$bodyHtml .= 'User-Agent: ' . ($userAgent !== '' ? e($userAgent) : '–') . '<br>';
$bodyHtml .= 'Origin: ' . ($origin !== '' ? e($origin) : '–');
$bodyHtml .= '</p>';

$bodyHtml .= '</body></html>';

/* ==========
   Zieladresse
   ========== */

$to = 'deniz.herrnreither03@gmail.com';

/* ==========
   Lokal vs. Live
   ========== */

$isLocal = in_array($_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1']);

if ($isLocal) {
    // Lokal: hübsch aber als Klartext loggen
    file_put_contents(
        __DIR__ . '/mail_log.txt',
        "----\n" . date('Y-m-d H:i:s') . "\n" . $bodyText . "\n",
        FILE_APPEND
    );

    echo json_encode(['success' => true, 'local' => true]);
    exit;
}

// Live: HTML-Mail versenden
$headers   = [];
$headers[] = "From: {$name} <{$email}>";
$headers[] = "Reply-To: {$email}";
$headers[] = "MIME-Version: 1.0";
$headers[] = "Content-Type: text/html; charset=UTF-8";

$ok = mail($to, $subject, $bodyHtml, implode("\r\n", $headers));

if ($ok) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'mail() ist fehlgeschlagen.'
    ]);
}
