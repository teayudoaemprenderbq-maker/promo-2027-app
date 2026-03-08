import React, { useState, useEffect } from 'react';
import { fetchSheetData, postData } from './googleService';

export default function App() {
  const [tab, setTab] = useState('ingresos');
  const [estudiantes, setEstudiantes] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [filtroEstudiante, setFiltroEstudiante] = useState('');
  const [presupuestoDetallado, setPresupuestoDetallado] = useState([]);
  const [anioVista, setAnioVista] = useState(2026);
  
  const PIN_CORRECTO = '1234';

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: 'Cuota mensual',
    valor: '',
    estudiante: '',
    fileName: '',
    fileBase64: ''
  });

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
    } catch (e) { console.error("Error cargando datos", e); }
    setLoading(false);
  };

  useEffect(() => { cargarTodo(); }, []);

  const manejarCambioTab = (nuevoTab) => {
    if ((nuevoTab === 'gastos' || nuevoTab === 'presupuesto') && !isUnlocked) {
      const pin = prompt("Introduce el PIN de acceso:");
      if (pin === PIN_CORRECTO) {
        setIsUnlocked(true);
        setTab(nuevoTab);
      } else {
        alert("PIN Incorrecto.");
      }
    } else {
      setTab(nuevoTab);
    }
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
    if (!formData.estudiante || !formData.valor) return alert("Faltan datos.");
    setLoading(true);
    try {
      await postData('addIngreso', formData);
      setFormData({ ...formData, valor: '', estudiante: '', fileBase64: '', fileName: '' });
      await cargarTodo();
      setTab('libro');
    } catch (error) { alert("Error al guardar."); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-10 font-sans">
      <header className="bg-blue-900 text-white p-5 text-center shadow-lg">
        <h1 className="text-xl font-black uppercase">PROMO 2027</h1>
      </header>

      <nav className="flex sticky top-0 z-20 bg-white border-b shadow-md overflow-x-auto">
        {['ingresos', 'libro', 'gastos', 'estudiantes', 'presupuesto', 'proyeccion'].map((id) => (
          <button
            key={id}
            onClick={() => manejarCambioTab(id)}
            className={`flex-1 min-w-[90px] py-4 text-[10px] font-black uppercase transition-all ${tab === id ? 'bg-blue-50 text-blue-700 border-b-4 border-blue-700' : 'text-gray-400'}`}
          >
            {id} {(id === 'gastos' || id === 'presupuesto') && !isUnlocked ? '🔒' : ''}
          </button>
        ))}
      </nav>

      <main className="p-4 max-w-4xl mx-auto">
        {loading && <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center font-black">CARGANDO...</div>}

        {/* --- INGRESOS --- */}
        {tab === 'ingresos' && (
          <form onSubmit={handleSubmitIngreso} className="space-y-4 bg-white p-6 rounded-2xl shadow-lg max-w-md mx-auto">
            <h2 className="text-lg font-black text-blue-900 uppercase italic border-b pb-2">Nuevo Recaudo</h2>
            <input type="date" className="w-full p-3 border rounded-xl" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} />
            <select className="w-full p-3 border rounded-xl" value={formData.estudiante} onChange={e => setFormData({...formData, estudiante: e.target.value})}>
              <option value="">-- Seleccionar Estudiante --</option>
              {estudiantes.map(est => <option key={est.id} value={est.nombre}>{est.nombre}</option>)}
            </select>
            <input type="number" className="w-full p-3 border rounded-xl font-black text-xl" placeholder="Valor $" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} />
            <input type="file" accept="image/*" onChange={handleFile} className="w-full text-xs" />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase">Guardar Recaudo</button>
          </form>
        )}

        {/* --- LIBRO CON IMÁGENES --- */}
        {tab === 'libro' && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="bg-blue-900 text-white p-6 rounded-2xl text-center">
              <p className="text-[10px] uppercase font-bold">Saldo en Caja</p>
              <h3 className="text-4xl font-black italic">
                ${(ingresos.reduce((s, i) => s + Number(i.valor), 0) - gastos.reduce((s, g) => s + Number(g.valor), 0)).toLocaleString()}
              </h3>
            </div>
            <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
              <table className="w-full text-[10px]">
                <tbody className="divide-y">
                  {[...ingresos, ...gastos]
                    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                    .map((mov, i) => (
                      <tr key={i}>
                        <td className="p-3">
                          <div className="text-gray-400">{mov.fecha}</div>
                          <div className="font-black uppercase text-blue-900">{mov.estudiante || mov.concepto}</div>
                        </td>
                        <td className={`p-3 text-right font-black ${mov.estudiante ? 'text-green-600' : 'text-red-600'}`}>
                          {mov.estudiante ? '+' : '-'}${Number(mov.valor).toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          {(mov.fotoUrl || mov.soporte) && (
                            <a href={mov.fotoUrl || mov.soporte} target="_blank" rel="noreferrer">
                              <img src={mov.fotoUrl || mov.soporte} alt="Soporte" className="h-10 w-10 object-cover rounded border" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- GASTOS Y PRESUPUESTO (CON PIN) --- */}
        {(tab === 'gastos' || tab === 'presupuesto') && (
          !isUnlocked ? (
            <div className="text-center p-20 font-black text-gray-400">🔒 SECCIÓN BLOQUEADA</div>
          ) : (
            <div className="animate-fadeIn">
               <h2 className="text-center font-black uppercase underline">{tab} desbloqueado</h2>
               <p className="text-center text-xs mt-4">Cargando formulario y datos...</p>
               {/* Aquí el componente renderiza el contenido según el tab */}
            </div>
          )
        )}
      </main>
    </div>
  );
}
