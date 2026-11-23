'use strict';
fetch('/api/admin/resumen').then(async r=>{if(!r.ok)throw new Error('No se pudieron cargar los registros.');return r.json()}).then(d=>{for(const k of ['total','confirmadas','no','empresas'])document.getElementById(k).textContent=new Intl.NumberFormat('es-MX').format(d[k])}).catch(e=>document.getElementById('adminError').textContent=e.message);
