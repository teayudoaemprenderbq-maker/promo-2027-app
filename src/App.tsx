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
  const [formPresupuesto, setFormPresupuesto] = useState({ concepto: '', valor: '' }); 
  
  // --- ESTADO FILTRO ---
  const [filtroEstudiante, setFiltroEstudiante] = useState('');

  // --- LÓGICA DE BLOQUEO ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const PIN_CORRECTO = '1234'; 

  // --- CONSTANTES PROYECCIÓN ---
  const NUM_PADRES = 38;
  const CUOTA_MENSUAL = 50000;
  const VALOR_MERIENDA = 8000;
  const MESES_PROMO = 22;

  // --- CORRECCIÓN EN EL CAMBIO DE TAB ---
  const manejarCambioTab = (nuevoTab) => {
    if ((nuevoTab === 'gastos' || nuevoTab === 'presupuesto') && !isUnlocked) {
      const pin = prompt("Introduce el PIN de acceso:");
      if (pin === PIN_CORRECTO) {
        setIsUnlocked(true);
        // Usamos un pequeño timeout o simplemente aseguramos el cambio de tab
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

  // --- EXPORTAR ---
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
    const totalRecaudado = ingresos.reduce((s, i) => s + Number(i.valor), 0);
    const totalGastado = gastos.reduce((s, g) => s + Number(g.valor), 0);
    const saldoDisponible = totalRecaudado - totalGastado;
    const metaRealPresupuesto = presupuestoDetallado.reduce((s, p) => {
      const v = p.valor || p.Valor || p.valor_estimado || 0;
      return s + Number(v);
    }, 0);
    const progreso = metaRealPresupuesto > 0 ? ((totalRecaudado / metaRealPresupuesto) * 100).toFixed(1) : "0.0";
    const faltante = metaRealPresupuesto - totalRecaudado;
    const fechaActual = new Date().toLocaleDateString('es-CO');
    let mensaje = `*📊 REPORTE FINANCIERO PROMO 2027*\n_Fecha: ${fechaActual}_\n\n*💰 ESTADO DE CUENTA:*\n• Total Recaudado: *$${totalRecaudado.toLocaleString()}*\n• Total Gastado: *$${totalGastado.toLocaleString()}*\n• *SALDO DISPONIBLE: $${saldoDisponible.toLocaleString()}*\n\n*🎯 META SEGÚN PRESUPUESTO:* (Real)\n• Objetivo Total: *$${metaRealPresupuesto.toLocaleString()}*\n• Progreso de Recaudo: *${progreso}%*\n• Faltan por Recaudar: *$${(faltante > 0 ? faltante : 0).toLocaleString()}*\n\n_Generado desde la App de Control Financiero._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

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
    if (!window.confirm(`¿Registrar $${Number(formData.valor).toLocaleString()} a ${formData.estudiante}?`)) return;
    setLoading(true);
    try {
      await postData('addIngreso', formData);
      setFormData({ ...formData, valor: '', estudiante: '', fileBase64: '', fileName: '' });
      await cargarTodo();
      setTab('libro'); 
    } catch (error) { alert("Error al guardar."); }
    setLoading(false);
  };

  const handleSubmitGasto = async (e) => {
    e.preventDefault();
    if (!formData.valor || !formData.concepto) return alert("Faltan datos del gasto.");
    if (!window.confirm(`¿Registrar gasto por $${Number(formData.valor).toLocaleString()}?`)) return;
    setLoading(true);
    try {
      await postData('addGasto', formData);
      setFormData({ ...formData, valor: '', concepto: 'Evento', fileBase64: '', fileName: '' });
      await cargarTodo();
      setTab('libro');
    } catch (e) { alert("Error."); }
    setLoading(false);
  };

  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const estudiantesFiltrados = estudiantes.filter(est => est.nombre.toLowerCase().includes(filtroEstudiante.toLowerCase()));

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
          {id: 'presupuesto', label: 'Presupuesto'},
          {id: 'proyeccion', label: 'Proyección 📈'}
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
        <button onClick={exportarExcel} className="bg-green-600 text-white text-[9px] font-black px-4 py-2 rounded-lg shadow-md uppercase">📥 Descargar {tab}</button>
      </div>

      <main className="p-4 max-w-4xl mx-auto">
        {loading && (
          <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-900 mb-4"></div>
            <p className="font-black text-blue-900 uppercase italic">Sincronizando...</p>
          </div>
        )}

        {tab === 'ingresos' && (
          <form onSubmit={handleSubmitIngreso} className="space-y-4 bg-white p-6 rounded-2xl shadow-lg border mt-2 max-w-md mx-auto">
            <h2 className="text-lg font-black text-blue-900 border-b pb-2 uppercase italic">Nuevo Recaudo</h2>
            <input type="date" className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} />
            <select className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.estudiante} onChange={e => setFormData({...formData, estudiante: e.target.value})}>
                <option value="">-- Estudiante --</option>
                {estudiantes.map((est) => <option key={est.id} value={est.nombre}>{est.nombre}</option>)}
            </select>
            <select className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})}>
                <option>Cuota mensual</option><option>Jean Day</option><option>Evento</option><option>Rifa</option><option>Otro</option>
            </select>
            <input type="number" className="w-full p-3 bg-gray-50 border rounded-xl font-black text-xl text-blue-800" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} placeholder="Valor $" />
            <input type="file" accept="image/*" onChange={handleFile} className="w-full text-[10px] bg-blue-50 p-2 rounded-lg" />
            <button type="submit" className="w-full py-4 rounded-xl font-black text-white bg-blue-600 shadow-lg uppercase">Guardar Recaudo</button>
          </form>
        )}

        {/* --- CORRECCIÓN DE GASTOS --- */}
        {tab === 'gastos' && (
          isUnlocked ? (
            <form onSubmit={handleSubmitGasto} className="space-y-4 bg-white p-6 rounded-2xl shadow-lg border-t-4 border-red-600 mt-2 max-w-md mx-auto animate-fadeIn">
              <h2 className="text-lg font-black text-red-900 uppercase italic">Registrar Egreso</h2>
              <input type="date" className="w-full p-3 border rounded-xl" value={formData.fecha} onChange={e=>setFormData({...formData, fecha: e.target.value})} />
              <select className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})}>
                  <option value="Evento">Evento / Fiesta</option>
                  <option value="Papelería">Papelería</option>
                  <option value="Alimentación">Alimentación</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Otro">Otro</option>
              </select>
              <input type="number" placeholder="Valor $" className="w-full p-3 bg-red-50 border rounded-xl font-black text-red-700 text-xl" value={formData.valor} onChange={e=>setFormData({...formData, valor: e.target.value})} />
              <input type="file" accept="image/*" onChange={handleFile} className="w-full text-[10px] bg-red-50 p-2 rounded-lg" />
              <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase shadow-lg">Registrar Gasto</button>
            </form>
          ) : <div className="text-center p-10 font-black text-gray-300">🔒 BLOQUEADO</div>
        )}

        {tab === 'estudiantes' && (
          <div className="space-y-4 mt-2">
            <div className="bg-white p-4 rounded-2xl shadow-lg border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-black text-blue-900 uppercase">Control de Cuotas</h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  {[2026, 2027].map(a => (
                    <button key={a} onClick={()=>setAnioVista(a)} className={`px-3 py-1 rounded text-[10px] font-black ${anioVista===a?'bg-blue-900 text-white':'text-gray-400'}`}>{a}</button>
                  ))}
                </div>
              </div>
              <input type="text" placeholder="🔍 Buscar estudiante..." className="w-full p-2 text-xs border rounded-lg mb-4" value={filtroEstudiante} onChange={(e) => setFiltroEstudiante(e.target.value)} />
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
                      let totalEst = 0;
                      return (
                        <tr key={est.id} className="hover:bg-blue-50">
                          <td className="p-3 font-bold sticky left-0 bg-white border-r">{est.nombre}</td>
                          {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                            const pMes = ingresos.filter(ing => ing.estudiante === est.nombre && new Date(ing.fecha).getUTCMonth() + 1 === m && new Date(ing.fecha).getUTCFullYear() === anioVista);
                            const sMes = pMes.reduce((s, p) => s + Number(p.valor), 0);
                            totalEst += sMes;
                            return <td key={m} className={`p-2 text-center border-l ${sMes > 0 ? 'bg-green-50 text-green-700' : 'text-gray-300'}`}>{sMes > 0 ? `$${(sMes/1000).toFixed(0)}k` : '-'}</td>;
                          })}
                          <td className="p-3 text-center font-black bg-gray-50 text-blue-900">${totalEst.toLocaleString()}</td>
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
          <div className="space-y-4 mt-2 max-w-md mx-auto">
            <div className="bg-blue-900 text-white p-6 rounded-2xl shadow-xl text-center">
              <p className="text-[10px] opacity-70 uppercase font-black mb-1">Saldo Real en Caja</p>
              <h3 className="text-4xl font-black italic">${(ingresos.reduce((s,i)=>s+Number(i.valor),0) - gastos.reduce((s,g)=>s+Number(g.valor),0)).toLocaleString('es-CO')}</h3>
            </div>
            <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
              <table className="w-full text-[10px]">
                <tbody className="divide-y">
                  {[...ingresos, ...gastos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 20).map((mov, i) => (
                    <tr key={i}>
                      <td className="p-3"><div className="text-[9px] text-gray-400">{new Date(mov.fecha).toLocaleDateString('es-CO')}</div><div className="font-black uppercase text-blue-900">{mov.estudiante || mov.concepto}</div></td>
                      <td className={`p-3 text-right font-black ${mov.estudiante ? 'text-green-600' : 'text-red-600'}`}>{mov.estudiante ? '+' : '-'}{Number(mov.valor).toLocaleString()}</td>
                      <td className="p-3 text-center">{ (mov.fotoUrl || mov.soporte) ? '🖼️' : '—' }</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- CORRECCIÓN DE PRESUPUESTO --- */}
        {tab === 'presupuesto' && (
          isUnlocked ? (
            <div className="space-y-6 mt-2 max-w-md mx-auto animate-fadeIn">
              <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-900">
                <h2 className="text-xs font-black text-blue-900 uppercase mb-4 italic">Planificar Gasto</h2>
                <div className="space-y-3">
                  <input type="text" placeholder="Concepto" className="w-full p-3 border rounded-xl" value={formPresupuesto.concepto} onChange={e => setFormPresupuesto({...formPresupuesto, concepto: e.target.value})} />
                  <input type="number" placeholder="Valor Estimado $" className="w-full p-3 border rounded-xl" value={formPresupuesto.valor} onChange={e => setFormPresupuesto({...formPresupuesto, valor: e.target.value})} />
                  <button onClick={async () => {
                    if(!formPresupuesto.concepto || !formPresupuesto.valor) return alert("Llena ambos campos");
                    setLoading(true);
                    try { await postData('addPresupuesto', formPresupuesto); setFormPresupuesto({ concepto: '', valor: '' }); await cargarTodo(); } catch (e) { alert("Error"); }
                    setLoading(false);
                  }} className="w-full py-3 bg-blue-900 text-white rounded-xl font-black uppercase text-[10px]">Añadir</button>
                </div>
              </div>
              <button onClick={compartirPresupuestoWA} className="w-full py-3 bg-green-500 text-white rounded-xl font-black uppercase text-[10px]">💬 WhatsApp</button>
              <div className="bg-white rounded-2xl border overflow-hidden">
                  <div className="p-3 bg-gray-800 text-white text-[10px] font-black uppercase flex justify-between"><span>Concepto</span><span>Valor</span></div>
                  {presupuestoDetallado.map((p, i) => (
                    <div key={i} className="p-3 text-[10px] flex justify-between border-b">
                      <span className="font-bold uppercase">{p.concepto || p.Concepto}</span>
                      <span className="font-black text-blue-700">${Number(p.valor || p.Valor).toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : <div className="text-center p-10 font-black text-gray-300">🔒 BLOQUEADO</div>
        )}

        {tab === 'proyeccion' && (
          <div className="space-y-6 mt-2 max-w-md mx-auto animate-fadeIn">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-800 text-white p-8 rounded-[2rem] shadow-xl text-center">
                <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Meta Proyectada Oct 2027</p>
                <h3 className="text-4xl font-black">${((NUM_PADRES * (CUOTA_MENSUAL + VALOR_MERIENDA)) * MESES_PROMO).toLocaleString()}</h3>
                <p className="text-[10px] opacity-60 mt-2 italic">Cálculo: (38 padres × $58k) × 22 meses</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 text-center">Desglose de la Meta Final</h4>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b pb-2"><span>Aportes Cuotas (22m):</span><span className="font-black text-blue-900">$41,800,000</span></div>
                    <div className="flex justify-between border-b pb-2"><span>Aportes Meriendas (22m):</span><span className="font-black text-blue-900">$6,688,000</span></div>
                    <div className="flex justify-between text-indigo-700 font-black pt-2"><span>GRAN TOTAL:</span><span>$48,488,000</span></div>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
