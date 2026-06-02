import smtplib
from email.message import EmailMessage

# Configuración (Para pruebas locales imprimiremos en consola, para prod usar SMTP real)
USE_REAL_SMTP = False
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "tu_correo@gmail.com"
SMTP_PASSWORD = "tu_password_de_aplicacion"

def enviar_notificacion_falta(email_tutor: str, nombre_estudiante: str, fecha: str):
    asunto = f"Aviso de Inasistencia: {nombre_estudiante}"
    cuerpo = f"""
Estimado Padre/Tutor,

El motivo de este correo es notificarle de manera automática que el estudiante *{nombre_estudiante}* ha sido registrado con estado de FALTA (Inasistencia) el día de hoy, {fecha}.

Por favor ingrese al sistema web del colegio para mayor detalle o comuníquese con la secretaría académica.

Atentamente,
Colegio Gabriel René Moreno.
    """

    if USE_REAL_SMTP:
        try:
            msg = EmailMessage()
            msg.set_content(cuerpo)
            msg["Subject"] = asunto
            msg["From"] = SMTP_USER
            msg["To"] = email_tutor

            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
            print(f"Correo real enviado a {email_tutor}")
        except Exception as e:
            print(f"Error enviando correo SMTP: {e}")
    else:
        # Modo simulación
        print("="*50)
        print("[SIMULACION DE ENVIO DE CORREO EXITOSA]")
        print(f"Para: {email_tutor}")
        print(f"Asunto: {asunto}")
        print(cuerpo)
        print("="*50)
