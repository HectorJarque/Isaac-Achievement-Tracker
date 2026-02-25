// Esta función de Vercel redirige al usuario a la página de login de Steam.
// Steam usa el protocolo OpenID 2.0, que es un sistema de autenticación estándar.

export default function handler(req, res) {
  // La URL base de tu frontend en GitHub Pages
  // Vercel lee esto de las variables de entorno que tú configuras
  const FRONTEND_URL = process.env.FRONTEND_URL;
  const BACKEND_URL = process.env.BACKEND_URL;

  // Construimos la URL de Steam OpenID con todos los parámetros requeridos
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    // Después del login, Steam redirigirá al usuario a esta URL con los datos
    'openid.return_to': `${BACKEND_URL}/api/auth/callback`,
    // El "realm" es el dominio que Steam mostrará al usuario en su página de login
    'openid.realm': BACKEND_URL,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });

  const steamLoginUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;

  // Redirigimos al usuario a Steam
  res.redirect(302, steamLoginUrl);
}