'use strict';
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname,'data'));
const filePath = path.join(dataDir,'Registros_Aliados_Estrategicos_2026.xlsx');
const templatePath = path.join(__dirname,'template','Registros_Aliados_Estrategicos_2026.xlsx');
const adminPassword = process.env.ADMIN_PASSWORD || '';
if (!adminPassword || adminPassword === 'CAMBIAR_POR_UNA_CONTRASENA_LARGA_Y_UNICA') {
  console.error('ERROR: Define ADMIN_PASSWORD seguro en .env o entorno antes de iniciar.');
  process.exit(1);
}
fs.mkdirSync(dataDir,{recursive:true});
if (!fs.existsSync(filePath)) fs.copyFileSync(templatePath,filePath);
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","https://fonts.googleapis.com"],imgSrc:["'self'","data:"],fontSrc:["'self'","https://fonts.gstatic.com"],connectSrc:["'self'"],frameAncestors:["'none'"],objectSrc:["'none'"],upgradeInsecureRequests:process.env.NODE_ENV==='production'?[]:null}}}));
app.use(express.json({limit:'16kb'}));
app.use(express.static(path.join(__dirname,'public'),{index:'index.html',dotfiles:'deny',extensions:['html']}));
const limit = new Map();
const MAX_LEN={nombre:80,apellidos:90,empresa:140,cargo:100,sector:55,correo:180,telefono:25,observaciones:320};
const SECTORES=new Set(['Empresa privada','Organismo empresarial','Institución pública','Institución educativa','Organización civil','Emprendimiento','Otro']);
const ESTADOS=new Set(['Confirmada','No asistiré']);
function clean(v,max){return String(v||'').replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function excelSafe(v){const s=String(v||'');return /^[\s]*[=+\-@]/.test(s) ? "'"+s : s;}
function validEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length<=180;}
function localTime(){return new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());}
function validPayload(raw){
 const o={}; for(const k of Object.keys(MAX_LEN))o[k]=clean(raw[k],MAX_LEN[k]);
 o.correo=o.correo.toLowerCase(); o.confirmacion=clean(raw.confirmacion,30);
 if(o.nombre.length<2 || o.apellidos.length<2 || o.empresa.length<2 || o.cargo.length<2 || !SECTORES.has(o.sector) || !validEmail(o.correo) || !ESTADOS.has(o.confirmacion) || raw.privacidad!==true) return null;
 if(o.telefono && !/^[\d\s()+.\-]{7,25}$/.test(o.telefono)) return null;
 return o;
}
let chain=Promise.resolve();
function queue(task){const job=chain.then(task);chain=job.catch(()=>{});return job;}
const dateNow=()=>new Date().toISOString();
function adminAuth(req,res,next){
 const raw=(req.headers.authorization||'').match(/^Basic (.+)$/);
 if(!raw){res.set('WWW-Authenticate','Basic realm="Aliados UAEMex", charset="UTF-8"');return res.status(401).send('Se requiere acceso del organizador.');}
 let pass='';let user='';try{const token=Buffer.from(raw[1],'base64').toString('utf8');let i=token.indexOf(':');user=token.slice(0,i);pass=token.slice(i+1);}catch{}
 const a=Buffer.from(pass); const b=Buffer.from(adminPassword);
 if(user!=='organizador' || a.length!==b.length || !crypto.timingSafeEqual(a,b)){
   res.set('WWW-Authenticate','Basic realm="Aliados UAEMex", charset="UTF-8"');return res.status(401).send('Credenciales incorrectas.');
 }
 next();
}
app.post('/api/confirmar',async(req,res)=>{
 const ip=String(req.ip || 'unknown');
 const now=Date.now(); const record=limit.get(ip) || [];
 const recent=record.filter(t=>now-t < 60*60*1000);
 if(recent.length>=15)return res.status(429).json({error:'Se alcanzó el límite de intentos. Intenta más tarde.'});
 recent.push(now);limit.set(ip,recent);
 if(req.body?.pagina_web)return res.status(400).json({error:'No fue posible procesar la solicitud.'});
 const v=validPayload(req.body||{});
 if(!v)return res.status(400).json({error:'Revisa los campos obligatorios y el aviso de privacidad.'});
 try{
  const result=await queue(async()=>{
   const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(filePath);
   const sheet=wb.getWorksheet('Registros'); if(!sheet)throw new Error('Hoja Registros no encontrada');
   // Las filas con formato vacío no cuentan como registros.
   let lastRow=5;
   for(let row=6;row<=sheet.rowCount;row++){
     if(sheet.getRow(row).getCell(1).value) lastRow=row;
     const val=String(sheet.getRow(row).getCell(8).value||'').trim().toLowerCase();
     if(val===v.correo)return {duplicate:true};
   }
   const index=lastRow+1;
   const folio='AE26-'+String(index-5).padStart(4,'0');
   const row=sheet.getRow(index);
   const values=[folio,localTime(),v.nombre,v.apellidos,v.empresa,v.cargo,v.sector,v.correo,v.telefono,v.confirmacion,v.observaciones,'Sí','Formulario web'];
   values.forEach((value,i)=>{const cell=row.getCell(i+1);cell.value=excelSafe(value);cell.protection={locked:true};cell.alignment={vertical:'middle',wrapText:i===4||i===10};if(i===9){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:v.confirmacion==='Confirmada'?'FFE7F3E8':'FFFCEDF0'}};}});
   row.height=26;sheet.views=[{state:'frozen',ySplit:5}];
   // Escribir al temporal y renombrar: evita archivo parcialmente escrito.
   const tmp=path.join(dataDir,'.rsvp-'+process.pid+'-'+crypto.randomUUID()+'.xlsx');
   try{await wb.xlsx.writeFile(tmp);await fs.promises.rename(tmp,filePath);}finally{await fs.promises.rm(tmp,{force:true}).catch(()=>{});}
   return {duplicate:false,folio,confirmacion:v.confirmacion};
  });
  if(result.duplicate) return res.status(409).json({error:'Este correo ya tiene una respuesta registrada. Si necesitas modificarla, contacta a los organizadores.'});
  res.status(201).json({ok:true,...result});
 }catch(err){console.error(dateNow(),'Error de Excel',err.message);res.status(500).json({error:'No fue posible guardar tu confirmación. Intenta nuevamente.'});}
});
app.get('/admin',adminAuth,(req,res)=>res.sendFile(path.join(__dirname,'private','admin.html')));
app.get('/api/admin/resumen',adminAuth,async(req,res)=>{
 try{
  const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(filePath);const s=wb.getWorksheet('Registros');
  let total=0,confirmadas=0,no=0; const empresas=new Set();
  for(let r=6;r<=s.rowCount;r++){const row=s.getRow(r);if(!row.getCell(1).value)continue;total++;const status=String(row.getCell(10).value||'');if(status==='Confirmada')confirmadas++;if(status==='No asistiré')no++;empresas.add(String(row.getCell(5).value||'').trim().toLowerCase());}
  res.json({total,confirmadas,no,empresas:empresas.size});
 }catch(e){console.error(e);res.status(500).json({error:'No se pudo leer el Excel.'});}
});
app.get('/api/admin/excel',adminAuth,(req,res)=>res.download(filePath,'Registros_Aliados_Estrategicos_2026.xlsx'));
app.get('/api/salud',(req,res)=>res.json({estado:'activo',almacen:'excel'}));
app.use((req,res)=>res.status(404).send('Página no encontrada'));
const server=app.listen(port,()=>console.log(`Página disponible en http://localhost:${port}`));
server.on('error',err=>{console.error(err);process.exit(1)});
