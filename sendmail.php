<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_STRING);
    $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
    $message = filter_input(INPUT_POST, 'message', FILTER_SANITIZE_STRING);

    if ($email && $name && $message) {
        $to = "deine-email@domain.de"; // Deine E-Mail-Adresse
        $subject = "Neue Nachricht von $name";
        $body = "Name: $name\nEmail: $email\n\nMessage:\n$message";
        $headers = "From: $email" . "\r\n" .
                   "Reply-To: $email" . "\r\n" .
                   "X-Mailer: PHP/" . phpversion();

        if (mail($to, $subject, $body, $headers)) {
            echo "Nachricht gesendet!";
        } else {
            echo "Beim Senden der Nachricht ist ein Fehler aufgetreten.";
        }
    } else {
        echo "Bitte alle Felder korrekt ausfüllen.";
    }
}
?>
