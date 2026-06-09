# 🐱 Michis Matemáticas

Juego educativo de matemáticas con gatos pixel art.  
Stack: **Python + Flask · MongoDB Atlas · Render · GitHub**

---

## Estructura del proyecto

```
michis-matematicas/
├── app.py                  # Servidor Flask + rutas + API
├── requirements.txt        # Dependencias Python
├── render.yaml             # Config de deploy en Render
├── .gitignore
├── templates/
│   ├── base.html           # Layout base (navbar, footer)
│   ├── index.html          # Página principal + juego
│   ├── dashboard.html      # Estadísticas y ranking
│   ├── login.html          # Inicio de sesión
│   └── register.html       # Registro de usuario
└── static/
    ├── css/
    │   └── style.css       # Todos los estilos
    ├── js/
    │   ├── main.js         # Utilidades globales (logout, etc.)
    │   └── game.js         # Lógica del juego + sonidos
    └── sounds/             # (reservado para archivos de audio extra)
```

---

## 1. Correr localmente

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/michis-matematicas.git
cd michis-matematicas

# 2. Crear entorno virtual
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Crear archivo .env (NO subir a GitHub)
echo "SECRET_KEY=mi-clave-secreta-local" > .env
echo "MONGO_URI=mongodb://localhost:27017/michis" >> .env

# 5. Ejecutar
python app.py
# Abre: http://localhost:5000
```

---

## 2. Configurar MongoDB Atlas (gratis)

1. Ir a [https://cloud.mongodb.com](https://cloud.mongodb.com) → crear cuenta gratuita
2. Crear un **Cluster Gratuito (M0)**
3. En **Database Access**: crear usuario con contraseña
4. En **Network Access**: agregar `0.0.0.0/0` (permitir todas las IPs para Render)
5. En **Connect → Connect your application**: copiar el URI de conexión

```
mongodb+srv://USUARIO:PASSWORD@cluster0.xxxxx.mongodb.net/michis_matematicas
```

---

## 3. Subir a GitHub

```bash
git init
git add .
git commit -m "✨ Initial commit - Michis Matemáticas"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/michis-matematicas.git
git push -u origin main
```

> ⚠️ Nunca subas el archivo `.env` — ya está en `.gitignore`

---

## 4. Deploy en Render

1. Ir a [https://render.com](https://render.com) → crear cuenta gratuita
2. **New → Web Service**
3. Conectar tu repositorio de GitHub
4. Render detecta automáticamente `render.yaml`
5. En **Environment Variables**, agregar:
   - `SECRET_KEY` → cualquier string largo aleatorio
   - `MONGO_URI`  → el URI de MongoDB Atlas (del paso 2)
6. Hacer **Deploy**

Tu app estará en: `https://michis-matematicas.onrender.com`

---

## 5. Variables de entorno necesarias

| Variable    | Descripción                          | Dónde configurar |
|-------------|--------------------------------------|------------------|
| `SECRET_KEY`| Clave secreta para sesiones Flask    | Render dashboard |
| `MONGO_URI` | URI de conexión a MongoDB Atlas      | Render dashboard |

---

## Tecnologías

- **Backend**: Python 3.11 + Flask 3 + PyMongo
- **Base de datos**: MongoDB Atlas (M0 gratis)
- **Frontend**: HTML5 + CSS3 + JavaScript vanilla
- **Tipografías**: Press Start 2P + Nunito (Google Fonts)
- **Audio**: Web Audio API (sin archivos externos)
- **Deploy**: Render + GitHub CI/CD automático
