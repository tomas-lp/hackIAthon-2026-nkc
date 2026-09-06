"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface RangeCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  onSelectRange: (start: string, end: string) => void;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAY_NAMES = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

export function RangeCalendarModal({
  isOpen,
  onClose,
  startDate,
  endDate,
  onSelectRange,
}: RangeCalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tempStart, setTempStart] = useState<string>(startDate || "");
  const [tempEnd, setTempEnd] = useState<string>(endDate || "");
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const formatDateStr = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (dayStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      // Nueva selección: primer click
      setTempStart(dayStr);
      setTempEnd("");
    } else if (tempStart && !tempEnd) {
      // Segundo click
      if (new Date(dayStr) < new Date(tempStart)) {
        setTempStart(dayStr);
        setTempEnd(tempStart);
      } else {
        setTempEnd(dayStr);
      }
    }
  };

  const isSelectedStart = (dayStr: string) => dayStr === tempStart;
  const isSelectedEnd = (dayStr: string) => dayStr === tempEnd;

  const isInRange = (dayStr: string) => {
    if (tempStart && tempEnd) {
      const d = new Date(dayStr).getTime();
      const s = new Date(tempStart).getTime();
      const e = new Date(tempEnd).getTime();
      return d >= s && d <= e;
    }
    if (tempStart && hoverDate) {
      const d = new Date(dayStr).getTime();
      const s = new Date(tempStart).getTime();
      const h = new Date(hoverDate).getTime();
      const min = Math.min(s, h);
      const max = Math.max(s, h);
      return d >= min && d <= max;
    }
    return false;
  };

  const handleApply = () => {
    if (tempStart) {
      const finalEnd = tempEnd || tempStart;
      onSelectRange(tempStart, finalEnd);
    }
    onClose();
  };

  const handleClear = () => {
    setTempStart("");
    setTempEnd("");
    onSelectRange("", "");
  };

  return (
    <div className="absolute left-0 top-full mt-2 z-50 bg-white dark:bg-[#1c2744] border border-gray-200 dark:border-[#2b395b] rounded-2xl shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] p-4 flex flex-col gap-3.5 w-72 animate-fadeIn font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-zinc-900 dark:text-white">
          <span>Seleccionar rango de fechas</span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navegación Mes/Año */}
      <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-white bg-zinc-50 dark:bg-[#161f36] border border-transparent dark:border-[#2b395b]/60 py-1.5 px-2 rounded-xl">
        <button
          onClick={handlePrevMonth}
          className="p-1 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-[#25355d] transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span>
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-[#25355d] transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid del Calendario */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_NAMES.map((wd) => (
          <div
            key={wd}
            className="text-[10px] font-bold text-zinc-400 dark:text-slate-400 uppercase py-1"
          >
            {wd}
          </div>
        ))}

        {/* Espacios vacíos antes del primer día */}
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} />
        ))}

        {/* Días del mes */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dayStr = formatDateStr(year, month, dayNum);
          const isStart = isSelectedStart(dayStr);
          const isEnd = isSelectedEnd(dayStr);
          const inRange = isInRange(dayStr);

          return (
            <button
              key={dayStr}
              onClick={() => handleDayClick(dayStr)}
              onMouseEnter={() => setHoverDate(dayStr)}
              className={`h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                isStart || isEnd
                  ? "bg-blue-600 text-white font-bold shadow-xs scale-105"
                  : inRange
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200"
                    : "text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-[#25355d] dark:hover:text-white"
              }`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* Footer Acciones */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-[#2b395b]">
        <button
          onClick={handleClear}
          className="text-xs font-semibold text-zinc-500 dark:text-slate-400 hover:text-zinc-800 dark:hover:text-white transition cursor-pointer"
        >
          Limpiar
        </button>
        <button
          onClick={handleApply}
          className="bg-zinc-900 dark:bg-blue-600 hover:bg-zinc-800 dark:hover:bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-2xs transition cursor-pointer"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
