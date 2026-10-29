import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export interface LocalizedDatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  className?: string;
}

const MONTHS_MR = [
  'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
];

const MONTHS_HI = [
  'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS_MR = ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
const WEEKDAYS_HI = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
const WEEKDAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const LocalizedDatePicker: React.FC<LocalizedDatePickerProps> = ({
  value,
  onChange,
  placeholder,
  label,
  minDate,
  maxDate,
  disabled = false,
  style,
  inputStyle,
  className,
}) => {
  const { currentLanguage, toDevanagari, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view year and month
  const initialDate = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-11

  // Update view when value changes
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  // Close calendar on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const monthNames = currentLanguage === 'mr' ? MONTHS_MR : currentLanguage === 'hi' ? MONTHS_HI : MONTHS_EN;
  const weekdays = currentLanguage === 'mr' ? WEEKDAYS_MR : currentLanguage === 'hi' ? WEEKDAYS_HI : WEEKDAYS_EN;

  // Format display string
  const formatDisplayDate = (val?: string) => {
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return '';
    const [y, m, d] = val.split('-').map(Number);
    const mName = monthNames[m - 1] || '';
    if (currentLanguage === 'mr' || currentLanguage === 'hi') {
      return `${toDevanagari(d)} ${mName} ${toDevanagari(y)}`;
    }
    return `${d} ${mName.slice(0, 3)} ${y}`;
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Generate days in month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      monthOffset: number; // -1 for prev, 0 for current, 1 for next
      dateStr: string;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        monthOffset: -1,
        dateStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
        isDisabled: (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate) || false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        monthOffset: 0,
        dateStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
        isDisabled: (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate) || false,
      });
    }

    // Next month padding to fill 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 1 : viewMonth + 2;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        monthOffset: 1,
        dateStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
        isDisabled: (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate) || false,
      });
    }

    return days;
  }, [viewYear, viewMonth, value, minDate, maxDate]);

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const [y, m] = todayStr.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    onChange(todayStr);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const currentDisplay = formatDisplayDate(value);

  return (
    <div
      ref={containerRef}
      className={`localized-datepicker-container ${className || ''}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        ...style,
      }}
    >
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 700,
            color: '#334155',
            marginBottom: '4px',
          }}
        >
          {label}
        </label>
      )}

      {/* Input box */}
      <div
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          backgroundColor: disabled ? '#F1F5F9' : '#FFFFFF',
          border: isOpen ? '1.5px solid #E96500' : '1px solid #CBD5E1',
          borderRadius: '7px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '34px',
          boxSizing: 'border-box',
          boxShadow: isOpen ? '0 0 0 3px rgba(233, 101, 0, 0.15)' : 'none',
          transition: 'all 0.15s ease',
          ...inputStyle,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
          <CalendarIcon size={14} color={isOpen ? '#E96500' : '#64748B'} style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: value ? 600 : 400,
              color: value ? '#1E293B' : '#94A3B8',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {currentDisplay || placeholder || (currentLanguage === 'mr' ? 'तारीख निवडा' : currentLanguage === 'hi' ? 'तारीख चुनें' : 'Select Date')}
          </span>
        </div>

        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
            title={t('clear', 'Clear')}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Popover Calendar Modal */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 9999,
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
            padding: '12px',
            width: '280px',
            boxSizing: 'border-box',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Header Month / Year & Nav */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              paddingBottom: '8px',
              borderBottom: '1px solid #F1F5F9',
            }}
          >
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569',
              }}
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', display: 'block' }}>
                {monthNames[viewMonth]} {currentLanguage === 'mr' || currentLanguage === 'hi' ? toDevanagari(viewYear) : viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569',
              }}
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Labels (Sun to Sat) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px',
              marginBottom: '4px',
              textAlign: 'center',
            }}
          >
            {weekdays.map((w, idx) => (
              <span
                key={w + idx}
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: idx === 0 ? '#DC2626' : '#64748B',
                  padding: '3px 0',
                }}
              >
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px',
              marginBottom: '10px',
            }}
          >
            {calendarDays.map((cd, idx) => {
              const isOtherMonth = cd.monthOffset !== 0;
              const isSelected = cd.isSelected;
              const isToday = cd.isToday;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={cd.isDisabled}
                  onClick={() => handleSelectDate(cd.dateStr)}
                  style={{
                    height: '32px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isToday && !isSelected ? '1.5px solid #E96500' : 'none',
                    borderRadius: '6px',
                    background: isSelected
                      ? '#E96500'
                      : isToday
                      ? '#FFF7ED'
                      : 'transparent',
                    color: isSelected
                      ? '#FFFFFF'
                      : cd.isDisabled
                      ? '#CBD5E1'
                      : isOtherMonth
                      ? '#94A3B8'
                      : '#1E293B',
                    fontWeight: isSelected || isToday ? 800 : 500,
                    fontSize: '12px',
                    cursor: cd.isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !cd.isDisabled) {
                      e.currentTarget.style.backgroundColor = '#F1F5F9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !cd.isDisabled) {
                      e.currentTarget.style.backgroundColor = isToday ? '#FFF7ED' : 'transparent';
                    }
                  }}
                >
                  {currentLanguage === 'mr' || currentLanguage === 'hi'
                    ? toDevanagari(cd.day)
                    : cd.day}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '8px',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <button
              type="button"
              onClick={handleSelectToday}
              style={{
                background: 'none',
                border: 'none',
                color: '#E96500',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: '4px',
              }}
            >
              {currentLanguage === 'mr' ? 'आजची तारीख' : currentLanguage === 'hi' ? 'आज की तारीख' : 'Today'}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: '#F1F5F9',
                border: 'none',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 10px',
                borderRadius: '5px',
              }}
            >
              {currentLanguage === 'mr' ? 'बंद करा' : currentLanguage === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default LocalizedDatePicker;
