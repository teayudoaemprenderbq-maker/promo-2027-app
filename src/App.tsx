import React, { useState, useEffect } from 'react';
import { fetchSheetData, postData } from './googleService';

export default function App() {
  // --- ESTADOS GLOBALES ---
  const [tab, setTab] = useState('ingresos');
  const [estudiantes, setEstudiantes] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [anioVista, setAnioVista] = useState(2026);
  const [metaFinal, setMetaFinal] = useState(30000000); 
  const [editandoMeta, setEditandoMeta] = useState(false);

  const [presupuestoDetallado, setPresupuestoDetallado] = useState([]);
  const [formPresupuesto, setFormPresupuesto] = useState({ 
    concepto: '', 
    valor: '', 
    tipo: 'ingreso', 
    mesInicio: 1, 
    mesFin: 1, 
    anio: 2026,
    esRango: false 
  });
  
  // --- NUEVO ESTADO PARA FILTRO DE APORTES ---
  const [filtroEstudiante, setFiltroEstudiante] = useState('');

  // --- LÓGICA DE BLOQUEO ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const PIN_CORRECTO = '1234';

  const manejarCambioTab = (nuevoTab) => {
    if ((nuevoTab === 'gastos' || nuevoTab === 'presupuesto') && !isUnlocked) {
      const pin = prompt("Introduce el PIN de acceso:");
      if (pin === PIN_CORRECTO) {
        setIsUnlocked(true);
        setTab(nuevoTab);
      } else {
        alert("PIN Incorrecto. Acceso denegado.");
      }
    } else {
      setTab(nuevoTab);
    }
  };

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: 'Cuota mensual',
    descripcion: '', 
    valor: '',
    estudiante: '',
    fileName: '',
    fileBase64: ''
  });

  // --- CARGA DE DATOS ---
  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [estData, ingData, gasData, preData] = await Promise.all([
        fetchSheetData('getEstudiantes'),
        fetchSheetData('getIngresos'),
        fetchSheetData('getGastos'),
        fetchSheetData('getPresupuesto') 
      ]);
      setEstudiantes(estData || []);
      setIngresos(ingData || []);
      setGastos(gasData || []);
      setPresupuestoDetallado(preData || []);
    } catch (e) {
      console.error("Error cargando datos", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // --- FUNCIONES DE EXPORTACIÓN Y COMPARTIR ---
  const exportarExcel = () => {
    let data = [];
    let filename = `reporte_${tab}.csv`;

    if (tab === 'ingresos' || tab === 'libro') data = [...ingresos, ...gastos];
    if (tab === 'estudiantes') data = estudiantes;
    if (tab === 'presupuesto') data = presupuestoDetallado;

    if (data.length === 0) return alert("No hay datos para exportar");

    const headers = Object.keys(data[0] || {}).join(",");
    const rows = data.map(obj => Object.values(obj).join(",")).join("\n");
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const compartirPresupuestoWA = () => {
    const totalRecaudado = ingresos.reduce((s, i) => s + Number(i.valor || 0), 0);
    const totalGastado = gastos.reduce((s, g) => s + Number(g.valor || 0), 0);
    const saldoDisponible = totalRecaudado - totalGastado;
    
    const metaRealPresupuesto = presupuestoDetallado.reduce((s, p) => {
      const v = p.valor || p.Valor || 0;
      return p.tipo === 'ingreso' ? s + Number(v) : s;
    }, 0);

    const progreso = metaRealPresupuesto > 0 
      ? ((totalRecaudado / metaRealPresupuesto) * 100).toFixed(1) 
      : "0.0";
    const faltante = metaRealPresupuesto - totalRecaudado;
    const fechaActual = new Date().toLocaleDateString('es-CO');

    let mensaje = `*📊 REPORTE FINANCIERO PROMO 2027*\n`;
    mensaje += `_Fecha: ${fechaActual}_\n\n`;
    
    mensaje += `*💰 ESTADO DE CUENTA:*\n`;
    mensaje += `• Total Recaudado: *$${totalRecaudado.toLocaleString()}*\n`;
    mensaje += `• Total Gastado: *$${totalGastado.toLocaleString()}*\n`;
    mensaje += `• *SALDO DISPONIBLE: $${saldoDisponible.toLocaleString()}*\n\n`;
    
    mensaje += `*🎯 META SEGÚN PRESUPUESTO:* (Real)\n`;
    mensaje += `• Objetivo Total: *$${metaRealPresupuesto.toLocaleString()}*\n`;
    mensaje += `• Progreso de Recaudo: *${progreso}%*\n`;
    mensaje += `• Faltan por Recaudar: *$${(faltante > 0 ? faltante : 0).toLocaleString()}*\n\n`;
    
    mensaje += `_Generado desde la App de Control Financiero._`;

    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // --- MANEJO DE ARCHIVOS ---
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, fileBase64: reader.result, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitIngreso = async (e) => {
    e.preventDefault();
    if (!formData.estudiante || !formData.valor) return alert("Selecciona estudiante y valor.");
    const val = Number(formData.valor);
    if (isNaN(val)) return alert("Valor no válido");

    const confirm1 = window.confirm(`¿Seguro que deseas registrar este ingreso?\n\nEstudiante: ${formData.estudiante}\nValor: $${val.toLocaleString()}`);
    if (!confirm1) return;

    setLoading(true);
    try {
      await postData('addIngreso', formData);
      alert("✅ Ingreso guardado con éxito.");
      setFormData({ ...formData, valor: '', estudiante: '', fileBase64: '', fileName: '' });
      await cargarTodo();
      setTab('libro'); 
    } catch (error) {
      alert("Error al guardar.");
    }
    setLoading(false);
  };

  const handleSubmitGasto = async (e) => {
    e.preventDefault();
    if (!formData.valor || !formData.concepto || !formData.descripcion) return alert("Faltan datos del gasto.");

    const val = Number(formData.valor);
    const confirmGasto = window.confirm(`¿Registrar gasto por $${val.toLocaleString()} en "${formData.descripcion}"?`);
    if (!confirmGasto) return;

    setLoading(true);
    try {
      await postData('addGasto', formData);
      alert("✅ Gasto registrado.");
      setFormData({ ...formData, valor: '', concepto: 'Evento', descripcion: '', fileBase64: '', fileName: '' });
      await cargarTodo();
      setTab('libro');
    } catch (e) { 
      alert("Error."); 
    }
    setLoading(false);
  };

  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const estudiantesFiltrados = estudiantes.filter(est => 
    est.nombre.toLowerCase().includes(filtroEstudiante.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 pb-10">
      <header className="bg-blue-900 text-white p-5 shadow-xl text-center">
        <h1 className="text-xl font-black uppercase tracking-widest">PROMO 2027</h1>
        <p className="text-[10px] opacity-80 uppercase font-bold text-blue-200">Colegio Santa María Del Rosario</p>
      </header>

      <nav className="flex sticky top-0 z-20 bg-white border-b shadow-md overflow-x-auto">
        {[
          {id: 'ingresos', label: 'Ingresos'},
          {id: 'libro', label: 'Libro'},
          {id: 'gastos', label: 'Gastos'},
          {id: 'estudiantes', label: 'Aportes'},
          {id: 'presupuesto', label: 'Presupuesto'}
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => manejarCambioTab(item.id)}
            className={`flex-1 min-w-[90px] py-4 px-2 text-[10px] uppercase font-black transition-all ${
              tab === item.id ? 'bg-blue-50 text-blue-700 border-b-4 border-blue-700' : 'text-gray-400'
            }`}
          >
            {item.label}
            {(item.id === 'gastos' || item.id === 'presupuesto') && !isUnlocked && ' 🔒'}
          </button>
        ))}
      </nav>

      <div className="max-w-4xl mx-auto px-4 mt-4 flex justify-end">
        <button 
          onClick={exportarExcel}
          className="bg-green-600 text-white text-[9px] font-black px-4 py-2 rounded-lg shadow-md uppercase flex items-center gap-2"
        >
          <span>📥</span> Descargar {tab}
        </button>
      </div>

      <main className="p-4 max-w-4xl mx-auto">
        {loading && (
          <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-900 mb-4"></div>
            <p className="font-black text-blue-900 uppercase">Sincronizando...</p>
          </div>
        )}

        {tab === 'ingresos' && (
          <form onSubmit={handleSubmitIngreso} className="space-y-4 bg-white p-6 rounded-2xl shadow-lg border mt-2 max-w-md mx-auto">
            <h2 className="text-lg font-black text-blue-900 border-b pb-2 uppercase italic">Nuevo Recaudo</h2>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Fecha</label>
              <input type="date" className="w-full p-3 bg-gray-50 border rounded-xl" 
                value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Estudiante</label>
              <select className="w-full p-3 bg-gray-50 border rounded-xl"
                value={formData.estudiante} onChange={e => setFormData({...formData, estudiante: e.target.value})}>
                <option value="">-- Seleccionar --</option>
                {estudiantes.map((est) => <option key={est.id} value={est.nombre}>{est.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Concepto</label>
              <select className="w-full p-3 bg-gray-50 border rounded-xl"
                value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})}>
                <option>Cuota mensual</option><option>Jean Day</option><option>Evento</option><option>Rifa</option><option>Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Valor ($)</label>
              <input type="number" className="w-full p-3 bg-gray-50 border rounded-xl font-black text-xl text-blue-800"
                value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} />
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border">
                <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Soporte de Pago (Foto)</label>
              <input type="file" accept="image/*" onChange={handleFile} className="w-full text-[10px]" />
            </div>
            <button type="submit" className="w-full py-4 rounded-xl font-black text-white bg-blue-600 shadow-lg uppercase">Guardar Recaudo</button>
          </form>
        )}

        {tab === 'gastos' && (
          <form onSubmit={handleSubmitGasto} className="space-y-4 bg-white p-6 rounded-2xl shadow-lg border-t-4 border-red-600 mt-2 max-w-md mx-auto">
            <h2 className="text-lg font-black text-red-900 uppercase italic">Registrar Egreso</h2>
            <input type="date" className="w-full p-3 border rounded-xl" value={formData.fecha} onChange={e=>setFormData({...formData, fecha: e.target.value})} />
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Clasificación</label>
              <select className="w-full p-3 bg-gray-50 border rounded-xl"
                value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})}>
                <option value="Evento">Evento / Fiesta</option>
                <option value="Papelería">Papelería</option>
                <option value="Alimentación">Alimentación</option>
                <option value="Transporte">Transporte</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Descripción Detallada</label>
              <input type="text" placeholder="¿En qué se gastó exactamente?" className="w-full p-3 bg-gray-50 border rounded-xl text-sm" 
                value={formData.descripcion} onChange={e=>setFormData({...formData, descripcion: e.target.value})} />
            </div>
            <input type="number" placeholder="Valor $" className="w-full p-3 bg-red-50 border rounded-xl font-black text-red-700 text-xl" 
              value={formData.valor} onChange={e=>setFormData({...formData, valor: e.target.value})} />
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <label className="block text-[10px] font-bold text-red-400 uppercase mb-1">Foto Soporte</label>
              <input type="file" accept="image/*" onChange={handleFile} className="w-full text-[10px]" />
            </div>
            <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase shadow-lg">Registrar Gasto</button>
          </form>
        )}

        {tab === 'estudiantes' && (
          <div className="space-y-4 mt-2">
            <div className="bg-white p-4 rounded-2xl shadow-lg border">
              <div className="mb-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-black text-blue-900 uppercase">Control de Cuotas</h2>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    {[2026, 2027].map(a => (
                      <button key={a} onClick={()=>setAnioVista(a)} className={`px-3 py-1 rounded text-[10px] font-black ${anioVista===a?'bg-blue-900 text-white':'text-gray-400'}`}>{a}</button>
                    ))}
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="🔍 Buscar estudiante..." 
                  className="w-full p-2 text-xs border rounded-lg bg-gray-50"
                  value={filtroEstudiante}
                  onChange={(e) => setFiltroEstudiante(e.target.value)}
                />
              </div>
              
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-[10px] border-collapse min-w-[800px]">
                  <thead className="bg-blue-900 text-white uppercase">
                    <tr>
                      <th className="p-3 sticky left-0 bg-blue-900 border-r z-10 min-w-[150px]">Estudiante</th>
                      {mesesNombres.map(m => <th key={m} className="p-2 border-l border-blue-800 text-center">{m}</th>)}
                      <th className="p-3 bg-blue-700 border-l border-blue-800 text-center">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {estudiantesFiltrados.map(est => {
                      let totalEstudiante = 0;
                      return (
                        <tr key={est.id} className="hover:bg-blue-50">
                          <td className="p-3 font-bold sticky left-0 bg-white border-r">{est.nombre}</td>
                          {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                            const pagosMes = ingresos.filter(ing => 
                              ing.estudiante === est.nombre && 
                              new Date(ing.fecha).getUTCMonth() + 1 === m && 
                              new Date(ing.fecha).getUTCFullYear() === anioVista
                            );
                            const sumaMes = pagosMes.reduce((s, p) => s + Number(p.valor || 0), 0);
                            totalEstudiante += sumaMes;
                            return (
                              <td key={m} className={`p-2 text-center border-l ${sumaMes > 0 ? 'bg-green-50 text-green-700' : 'text-gray-300'}`}>
                                {sumaMes > 0 ? `$${(sumaMes/1000).toFixed(0)}k` : '-'}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center font-black bg-gray-50 text-blue-900 border-l">
                            ${totalEstudiante.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'libro' && (
          <div className="space-y-4 mt-2 max-w-md mx-auto animate-fadeIn">
            <div className="bg-blue-900 text-white p-6 rounded-2xl shadow-xl text-center border-b-4 border-blue-700">
              <p className="text-[10px] opacity-70 uppercase font-black tracking-widest mb-1">Saldo Real en Caja</p>
              <h3 className="text-4xl font-black italic">
                ${(ingresos.reduce((s,i)=>s+Number(i.valor || 0),0) - gastos.reduce((s,g)=>s+Number(g.valor || 0),0)).toLocaleString('es-CO')}
              </h3>
            </div>

            <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
              <table className="w-full text-[10px]">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-[8px] uppercase font-black text-gray-400">
                    <th className="p-3 text-left">Detalle</th>
                    <th className="p-3 text-left">Concepto</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 text-center">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...ingresos, ...gastos]
                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .slice(0, 30)
                    .map((mov, i) => {
                      const link = mov.fotoUrl || mov.soporte || mov.soporte_url || "";
                      const tieneSoporte = typeof link === 'string' && link.startsWith('http');
                      const conceptoMuestra = mov.concepto || (mov.estudiante ? "Aporte" : "Gasto");

                      return (
                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-3">
                            <div className="text-[9px] font-bold text-gray-400">
                              {new Date(mov.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}
                            </div>
                            <div className="font-black uppercase text-blue-900 truncate max-w-[100px]">
                              {mov.estudiante ? mov.estudiante : (mov.descripcion || mov.concepto)}
                            </div>
                          </td>
                          <td className="p-3 text-gray-500 italic uppercase text-[9px]">
                            {conceptoMuestra}
                          </td>
                          <td className={`p-3 text-right font-black ${mov.estudiante ? 'text-green-600' : 'text-red-600'}`}>
                            {mov.estudiante ? '+' : '-'}{Number(mov.valor || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            {tieneSoporte ? (
                              <a 
                                href={link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
                              >
                                <span style={{ fontSize: '14px' }}>🖼️</span>
                              </a>
                            ) : (
                              <span className="text-gray-200 italic text-[18px]"> —</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'presupuesto' && (
  <div className="space-y-6 mt-2 animate-fadeIn max-w-4xl mx-auto">
    
    {/* FORMULARIO: Mantiene todas las funciones de rango, concepto, valor y tipo */}
    <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-900">
      <h2 className="text-xs font-black text-blue-900 uppercase mb-4 italic text-center">Programador de Presupuesto</h2>
      
      <div className="space-y-3">
        <input type="text" placeholder="Concepto (Ej: Merienda)" className="w-full p-3 border rounded-xl text-sm"
          value={formPresupuesto.concept} onChange={e => setFormPresupuesto({...formPresupuesto, concepto: e.target.value})} />
        
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder="Valor Mensual $" className="w-full p-3 border rounded-xl text-sm font-bold"
            value={formPresupuesto.valor} onChange={e => setFormPresupuesto({...formPresupuesto, valor: e.target.value})} />
          
          <select className="p-3 border rounded-xl text-sm bg-gray-50 font-bold"
            value={formPresupuesto.tipo} onChange={e => setFormPresupuesto({...formPresupuesto, tipo: e.target.value})}>
            <option value="ingreso">🟢 Ingreso</option>
            <option value="gasto">🔴 Gasto</option>
          </select>
        </div>

        {/* Selector de Rango o Mes Único */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setFormPresupuesto({...formPresupuesto, esRango: false})}
            className={`flex-1 py-2 text-[10px] font-black rounded-lg transition ${!formPresupuesto.esRango ? 'bg-white shadow-sm text-blue-900' : 'text-gray-400'}`}>
            UN SOLO MES
          </button>
          <button onClick={() => setFormPresupuesto({...formPresupuesto, esRango: true})}
            className={`flex-1 py-2 text-[10px] font-black rounded-lg transition ${formPresupuesto.esRango ? 'bg-white shadow-sm text-blue-900' : 'text-gray-400'}`}>
            RANGO DE MESES
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <label className="text-[9px] font-bold text-gray-400 ml-1 uppercase">{formPresupuesto.esRango ? 'Desde' : 'Mes'}</label>
            <select className="p-3 border rounded-xl text-sm bg-gray-50"
              value={formPresupuesto.mesInicio} onChange={e => setFormPresupuesto({...formPresupuesto, mesInicio: parseInt(e.target.value)})}>
              {mesesNombres.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          {formPresupuesto.esRango && (
            <div className="flex flex-col">
              <label className="text-[9px] font-bold text-gray-400 ml-1 uppercase">Hasta</label>
              <select className="p-3 border rounded-xl text-sm bg-gray-50"
                value={formPresupuesto.mesFin} onChange={e => setFormPresupuesto({...formPresupuesto, mesFin: parseInt(e.target.value)})}>
                {mesesNombres.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
        </div>

        <button 
          onClick={async () => {
            if(!formPresupuesto.concepto || !formPresupuesto.valor) return alert("Faltan datos");
            if(formPresupuesto.esRango && formPresupuesto.mesFin < formPresupuesto.mesInicio) return alert("El mes de fin debe ser mayor al de inicio");
            
            setLoading(true);
            try {
              const inicio = formPresupuesto.mesInicio;
              const fin = formPresupuesto.esRango ? formPresupuesto.mesFin : inicio;
              
              // Aquí sigue procesando mes a mes (RANGO O ÚNICO)
              for(let m = inicio; m <= fin; m++) {
                await postData('addPresupuesto', {
                  concepto: formPresupuesto.concepto,
                  valor: Number(formPresupuesto.valor),
                  tipo: formPresupuesto.tipo,
                  mes: m,
                  anio: anioVista
                });
              }
              alert(`Éxito: Se registraron ${fin - inicio + 1} meses.`);
              await cargarTodo();
              setFormPresupuesto({...formPresupuesto, concepto: '', valor: ''}); // Limpiar campos
            } catch (e) { alert("Error al guardar"); }
            setLoading(false);
          }} 
          className="w-full py-4 bg-blue-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
        >
          {formPresupuesto.esRango ? 'Generar Programación' : 'Añadir al Presupuesto'}
        </button>
      </div>
    </div>

    {/* TABLA: Muestra ingresos y gastos discriminados */}
    <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] text-left border-collapse min-w-[800px]">
          <thead className="bg-gray-900 text-white uppercase font-black">
            <tr>
              <th className="p-3 sticky left-0 bg-gray-900 z-10 border-r min-w-[150px]">Concepto</th>
              {mesesNombres.map(m => <th key={m} className="p-2 text-center border-l text-[8px]">{m.substring(0,3)}</th>)}
              <th className="p-3 text-right bg-gray-800">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...new Set(presupuestoDetallado.map(p => p.concepto))].map(conc => {
              const items = presupuestoDetallado.filter(p => p.concepto === conc && Number(p.anio) === anioVista);
              if (items.length === 0) return null;
              
              const esIngreso = items[0].tipo === 'ingreso';

              return (
                <tr key={conc} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-bold sticky left-0 bg-white border-r">
                    {esIngreso ? '🟢' : '🔴'} {conc}
                  </td>
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                    const mesData = items.find(it => Number(it.mes) === m);
                    const val = mesData ? Number(mesData.valor) : 0;
                    return (
                      <td key={m} className={`p-2 text-center border-l ${val > 0 ? (esIngreso ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700') : 'text-gray-200'}`}>
                        {val > 0 ? `$${(val/1000).toFixed(0)}k` : '—'}
                      </td>
                    );
                  })}
                  <td className={`p-3 text-right font-black bg-gray-50 ${esIngreso ? 'text-green-800' : 'text-red-800'}`}>
                    ${items.reduce((s, it) => s + Number(it.valor), 0).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
 
            {/* RESUMEN FINAL */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 rounded-3xl text-white shadow-2xl">
               <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-black uppercase tracking-widest opacity-80">Proyección Global</h4>
               </div>
               <div className="grid grid-cols-2 gap-6 text-center">
                  <div>
                    <p className="text-[10px] uppercase opacity-60">Ingresos Totales</p>
                    <p className="text-2xl font-black">${presupuestoDetallado.filter(p=>p.tipo==='ingreso').reduce((s,it)=>s+Number(it.valor || it.Valor || 0),0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-60">Gastos Totales</p>
                    <p className="text-2xl font-black text-red-300">${presupuestoDetallado.filter(p=>p.tipo==='gasto').reduce((s,it)=>s+Number(it.valor || it.Valor || 0),0).toLocaleString()}</p>
                  </div>
               </div>
               <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-[9px] uppercase opacity-60">Saldo Final Estimado</p>
                    <p className="text-3xl font-black italic text-yellow-400">
                      ${(presupuestoDetallado.filter(p=>p.tipo==='ingreso').reduce((s,it)=>s+Number(it.valor || it.Valor || 0),0) - 
                         presupuestoDetallado.filter(p=>p.tipo==='gasto').reduce((s,it)=>s+Number(it.valor || it.Valor || 0),0)).toLocaleString()}
                    </p>
                  </div>
                  <button onClick={compartirPresupuestoWA} className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-xl transition-all shadow-lg">
                      💬 Compartir
                  </button>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
