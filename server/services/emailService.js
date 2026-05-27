const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function getUrgencyColor(urgencia) {
  const colors = {
    critico: '#DC2626',
    urgente: '#F59E0B',
    alerta: '#2563EB',
    normal: '#16A34A',
  };
  return colors[urgencia] || '#64748B';
}

function getUrgencyLabel(urgencia) {
  const labels = {
    critico: 'CRITICO - Sin Stock',
    urgente: 'URGENTE - Stock Minimo',
    alerta: 'ALERTA - Stock Bajo',
    normal: 'Normal',
  };
  return labels[urgencia] || urgencia;
}

function buildEmailHTML(alerts, clienteNombre, clienteEmpresa) {
  const alertRows = alerts.map(a => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0;">
        <strong style="color: #1E293B;">${a.nombre}</strong><br>
        <span style="color: #64748B; font-size: 13px;">${a.categoria}</span>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; text-align: center;">
        <span style="font-weight: 700; font-size: 18px; color: ${getUrgencyColor(a.urgencia)};">${a.stock_actual}</span>
        <br><span style="color: #64748B; font-size: 12px;">${a.unidad}</span>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; text-align: center;">
        ${a.stock_minimo} ${a.unidad}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; text-align: center;">
        <strong style="color: #2563EB;">${a.cantidad_sugerida} ${a.unidad}</strong>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; text-align: center;">
        <span style="
          display: inline-block;
          padding: 4px 10px;
          border-radius: 9999px;
          background: ${getUrgencyColor(a.urgencia)}20;
          color: ${getUrgencyColor(a.urgencia)};
          font-size: 12px;
          font-weight: 600;
        ">${getUrgencyLabel(a.urgencia)}</span>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de Reposicion de Stock - CIVELE</title>
</head>
<body style="margin: 0; padding: 0; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 700px; margin: 32px auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
    
    <!-- Header -->
    <div style="background: #2563EB; padding: 32px 40px;">
      <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">CIVELE</h1>
      <p style="margin: 6px 0 0; color: #BFDBFE; font-size: 14px;">Plataforma de Gestion de Inventario</p>
    </div>

    <!-- Alerta Banner -->
    <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px 40px;">
      <p style="margin: 0; color: #92400E; font-weight: 600; font-size: 14px;">
        Solicitud de Reposicion de Stock Detectada por IA
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 40px;">
      <p style="color: #1E293B; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Hola,<br><br>
        El sistema de inventario inteligente de <strong>${clienteNombre}</strong> 
        ${clienteEmpresa ? `(${clienteEmpresa})` : ''} ha detectado que los siguientes 
        productos requieren reposicion urgente. Por favor revise los detalles y proceda 
        con el envio segun disponibilidad.
      </p>

      <!-- Tabla de productos -->
      <div style="border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #F1F5F9;">
              <th style="padding: 12px 16px; text-align: left; color: #64748B; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Producto</th>
              <th style="padding: 12px 16px; text-align: center; color: #64748B; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Stock Actual</th>
              <th style="padding: 12px 16px; text-align: center; color: #64748B; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Stock Minimo</th>
              <th style="padding: 12px 16px; text-align: center; color: #64748B; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Cantidad Solicitada</th>
              <th style="padding: 12px 16px; text-align: center; color: #64748B; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Urgencia</th>
            </tr>
          </thead>
          <tbody>
            ${alertRows}
          </tbody>
        </table>
      </div>

      <p style="margin: 24px 0 0; color: #64748B; font-size: 13px; line-height: 1.6;">
        Este mensaje fue generado automaticamente por el Motor de Analisis de Inventario de CIVELE.
        Si tiene alguna pregunta, por favor contacte directamente al cliente.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #F8FAFC; padding: 20px 40px; border-top: 1px solid #E2E8F0;">
      <p style="margin: 0; color: #94A3B8; font-size: 12px; text-align: center;">
        CIVELE - Plataforma de Gestion Cliente-Proveedor &nbsp;|&nbsp; No responda a este correo
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

async function sendStockAlertEmail(to, alerts, clienteNombre, clienteEmpresa) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP no configurado. El correo no fue enviado. Configure SMTP_USER y SMTP_PASS en .env');
    return { success: false, reason: 'SMTP no configurado' };
  }

  try {
    const html = buildEmailHTML(alerts, clienteNombre, clienteEmpresa);
    const criticalCount = alerts.filter(a => a.urgencia === 'critico').length;
    const urgentCount = alerts.filter(a => a.urgencia === 'urgente').length;

    let subjectPrefix = 'Solicitud de Reposicion';
    if (criticalCount > 0) subjectPrefix = 'URGENTE - Stock Critico Detectado';
    else if (urgentCount > 0) subjectPrefix = 'ALERTA - Stock Bajo Detectado';

    await transporter.sendMail({
      from: `"CIVELE" <${process.env.SMTP_USER}>`,
      to,
      subject: `${subjectPrefix} - ${clienteNombre} | CIVELE`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Error enviando correo:', error.message);
    return { success: false, reason: error.message };
  }
}

module.exports = { sendStockAlertEmail };
