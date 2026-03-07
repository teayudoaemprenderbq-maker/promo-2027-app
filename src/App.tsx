import React, { useState } from 'react';
import { Lock, Wallet, ArrowUpCircle, ArrowDownCircle, Info, Calculator } from 'lucide-react';

// --- CONFIGURACIÓN MAESTRA PROMO 2027 ---
const PIN_ACCESO = "1234";
const NUM_ESTUDIANTES = 38;
const CUOTA_MENSUAL = 50000;
const VALOR_MERIENDA = 8000;
const MESES_TOTALES = 22; // Enero 2026 a Octubre 2027

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  // --- DATOS DE EJEMPLO (Puedes editarlos luego) ---
  const [gastos, setGastos] = useState([
    { id: 1, concepto: 'Fiesta de Grado Estimada', monto: 25000000 },
    { id: 2, concepto: 'Chaquetas y Prom', monto: 12000000 },
    { id: 3, concepto: 'Gastos Administrativos', monto: 2000000 },
  ]);

  const [rifas, setRifas] = useState([
    { id: 1, nombre: 'Rifa Semestral 1 (Junio 2026)', monto: 2000000 },
  ]);

  // --- CÁLCULOS AUTOMÁTICOS DE INGRESOS ---
  const ingresoMensualCuotas = NUM_ESTUDIANTES * CUOTA_MENSUAL;
  const ingresoMensualMeriendas = NUM_ESTUDIANTES * VALOR_MERIENDA;
  const totalMensualFijo = ingresoMensualCuotas + ingresoMensualMeriendas;

  const totalProyectadoCuotas = ingresoMensualCuotas * MESES_TOTALES;
  const totalProyectadoMeriendas = ingresoMensualMeriendas * MESES_TOTALES;
  const totalRifas = rifas.reduce((acc, r) => acc + r.monto, 0);

  const granTotalIngresos = totalProyectadoCuotas + totalProyectadoMeriendas + totalRifas;
  const granTotalGastos = gastos.reduce((acc, g) => acc + g.monto, 0);
  const balanceFinal = granTotalIngresos - granTotalGastos;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === PIN_ACCESO) {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("PIN incorrecto");
      setPin("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100">
          <div className="flex justify-center mb-6 text-indigo-600">
            <Lock size={48} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Promo 2027</h1>
          <p className="text-center text-slate-500 mb-8 text-sm">Control de Presupuesto e Ingresos</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="PIN de acceso"
              className="w-full p-4 border-2 border-slate-100 rounded-2xl text-center text-2xl tracking-[1em] focus:border-indigo-500 outline-none transition-all"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
            <button className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Header */}
      <nav className="bg-white border-b sticky top-0 z-10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h2 className="font-black text-indigo-600 text-xl tracking-tight">PROMO 2027</h2>
          <div className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-600 uppercase">
            Planificación Financiera
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        {/* DASHBOARD PRINCIPAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600 mb-3">
              <ArrowUpCircle size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Ingresos Totales</span>
            </div>
            <p className="text-2xl font-black text-slate-800">${granTotalIngresos.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-500 font-bold mt-1">PROYECCIÓN 22 MESES</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm">
            <div className="flex items-center gap-2 text-rose-600 mb-3">
              <ArrowDownCircle size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Gastos Estimados</span>
            </div>
            <p className="text-2xl font-black text-slate-800">${granTotalGastos.toLocaleString()}</p>
            <p className="text-[10px] text-rose-400 font-bold mt-1">META DE EGRESOS</p>
          </div>

          <div className={`p-6 rounded-3xl shadow-sm border ${balanceFinal >= 0 ? 'bg-indigo-600 border-indigo-700' : 'bg-orange-500 border-orange-600'}`}>
            <div className="flex items-center gap-2 text-white/80 mb-3">
              <Wallet size={20} />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Reserva Final</span>
            </div>
            <p className="text-2xl font-black text-white">${balanceFinal.toLocaleString()}</p>
            <p className="text-[10px] text-white/70 font-bold mt-1 uppercase">Sobra / Falta</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* COLUMNA IZQUIERDA: INGRESOS */}
          <section className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Calculator size={20} className="text-indigo-500" /> Plan de Recaudación
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-700">Cuotas Mensuales</p>
                    <p className="text-[11px] text-slate-500">38 Padres × $50.000</p>
                  </div>
                  <span className="text-emerald-600 font-black">+${ingresoMensualCuotas.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-700">Meriendas Mensuales</p>
                    <p className="text-[11px] text-slate-500">38 Ventas × $8.000</p>
                  </div>
                  <span className="text-emerald-600 font-black">+${ingresoMensualMeriendas.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-sm font-black text-indigo-700">TOTAL RECAUDO MENSUAL</p>
                  <span className="text-indigo-700 font-black">${totalMensualFijo.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                <Info size={18} className="text-blue-500 flex-shrink-0" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Basado en <strong>22 meses</strong> (Ene 2026 - Oct 2027), el recaudo por cuotas será de <strong>${totalProyectadoCuotas.toLocaleString()}</strong> y por meriendas <strong>${totalProyectadoMeriendas.toLocaleString()}</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* COLUMNA DERECHA: GASTOS */}
          <section className="bg-white p-6 rounded-3xl border shadow-sm h-fit">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <ArrowDownCircle size={20} className="text-rose-500" /> Presupuesto de Gastos
            </h3>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="pb-4">Concepto</th>
                    <th className="pb-4 text-right">Inversión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {gastos.map((g) => (
                    <tr key={g.id}>
                      <td className="py-4 text-sm text-slate-600 font-medium">{g.concepto}</td>
                      <td className="py-4 text-right text-sm font-black text-slate-800">${g.monto.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
