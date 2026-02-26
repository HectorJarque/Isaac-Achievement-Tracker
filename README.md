# Isaac Achievement Tracker

> Seguimiento de logros para *The Binding of Isaac* con integración de Steam

[![Vercel](https://img.shields.io/badge/Web-isaac--achievement--tracker.vercel.app-black?logo=vercel)](https://isaac-achievement-tracker.vercel.app)
[![Steam OpenID](https://img.shields.io/badge/Auth-Steam%20OpenID-1b2838?logo=steam)](https://steamcommunity.com/dev)

**Read in English:** [README\_EN.md](README_EN.md)

---

## Qué es

Isaac Achievement Tracker es una herramienta web gratuita para jugadores de *The Binding of Isaac*. Conecta tu cuenta de Steam y verás de un vistazo todos tus logros desbloqueados, los que te faltan y cómo conseguirlos, organizados por versión del juego y por personaje.

Cubre las cinco versiones del juego: Rebirth, Afterbirth, Afterbirth+, Repentance y Repentance+, con los 637 logros oficiales.

---

## Cómo usarla

1. Accede a [isaac-achievement-tracker.vercel.app](https://isaac-achievement-tracker.vercel.app)
2. Asegúrate de que tu perfil de Steam es **público** (ajustes de privacidad en Steam)
3. Pulsa el botón **Iniciar sesión con Steam**
4. Acepta en la página de Steam — no se te pedirá ninguna contraseña en esta web
5. Tu progreso cargará automáticamente en el panel de logros

---

## Cómo funciona el login con Steam

La autenticación se realiza mediante **Steam OpenID 2.0**, un protocolo estándar y seguro. Al pulsar el botón de inicio de sesión, esta web te redirige a los servidores de Steam, donde introduces tus credenciales directamente. En ningún momento esta aplicación recibe ni almacena tu contraseña ni tu email.

Lo único que Steam devuelve a la aplicación es tu **Steam ID**, que es un identificador público visible en la URL de cualquier perfil de Steam. Con ese ID se consulta la Steam Web API para leer los logros de tu perfil público.

La sesión es temporal: al cerrar el navegador o la pestaña, la conexión con Steam se desvincula automáticamente.

---

## Privacidad

- Esta web solo accede a tu Steam ID y a los logros de tu perfil público.
- No se guarda ningún dato personal en ninguna base de datos.
- No hay publicidad ni cookies de seguimiento de ningún tipo.
- Ningún administrador de esta web puede ver más información de tu cuenta de la que es pública en Steam.

---

## Requisito de perfil público

La Steam Web API solo permite leer logros de perfiles configurados como públicos. Si tu perfil es privado o restringido, la aplicación no podrá cargar tu progreso.

Para hacerlo público: Steam → tu perfil → Editar perfil → Privacidad → Estado del juego → Público.

---

## Créditos

Desarrollado por [HectorJarque](https://github.com/HectorJarque).

Los datos y activos de logros pertenecen a *The Binding of Isaac*, desarrollado por Nicalis y Edmund McMillen. Este proyecto no tiene ninguna afiliación oficial con los creadores del juego.
