# Guía de Ejecución Local para iPhone

Esta guía te permitirá ejecutar la aplicación en tu PC y acceder a ella desde tu iPhone a través de tu red Wi-Fi.

## 1. Requisitos Previos
*   Tu PC y tu iPhone deben estar conectados a la **misma red Wi-Fi**.
*   Debes tener el servidor Python ejecutándose en tu PC.

## 2. Iniciar el Servidor
En tu PC, ejecuta el servidor como siempre:
```bash
python backend/app.py
```
Verás un mensaje indicando que está corriendo (ignora las advertencias de "development server").

## 3. Averiguar tu Dirección IP Local
Necesitas la IP de tu PC para conectarte desde el móvil.

1.  Abre una terminal (PowerShell o CMD).
2.  Escribe el comando:
    ```powershell
    ipconfig
    ```
3.  Busca la línea que dice **IPv4 Address** (Dirección IPv4) bajo tu adaptador de Wi-Fi.
    *   Suele ser algo como `192.168.1.XX` o `10.0.0.XX`.
    *   *Ejemplo: 192.168.1.45*

## 4. Conectar desde el iPhone
1.  Abre **Safari** en tu iPhone.
2.  En la barra de direcciones, escribe la IP seguida del puerto `:5000`.
    *   Ejemplo: `http://192.168.1.45:5000`
3.  Deberías ver la aplicación cargada.

## 5. Instalar como App (PWA)
Para que se vea a pantalla completa y sin barras de navegador:

1.  En Safari, pulsa el botón **Compartir** (cuadrado con flecha hacia arriba).
2.  Busca y selecciona **"Añadir a la pantalla de inicio"** (Add to Home Screen).
3.  Pulsa "Añadir".
4.  Ahora tendrás el icono de **Prisma Aletheia** en tu iPhone. Al abrirlo, se mostrará como una app nativa a pantalla completa.

> [!NOTE]
> Si la app no carga, asegúrate de que el Firewall de Windows no esté bloqueando el puerto 5000 o Python. Puedes probar a desactivarlo temporalmente para verificar.
