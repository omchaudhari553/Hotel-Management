import React, { useState } from 'react';
import { Search, Inbox } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  actionButton?: React.ReactNode;
  emptyMessage?: string;
}

export function DataTable<T extends { id?: number | string }>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search records...',
  actionButton,
  emptyMessage = 'No records found',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = data.filter((item) => {
    if (!searchTerm || !searchKey) return true;
    const val = item[searchKey];
    if (val === undefined || val === null) return false;
    return String(val).toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {(searchKey || actionButton) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {searchKey && (
            <div style={{ maxWidth: '340px', width: '100%', position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '14px', color: '#78716C', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                <Search size={16} />
              </div>
              <input
                type="text"
                className="input"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px', height: '42px', fontSize: '0.88rem' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: '#78716C', fontWeight: 600 }}>
              Showing {filteredData.length} of {data.length} records
            </span>
            {actionButton && <div>{actionButton}</div>}
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px 20px', color: '#78716C' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Inbox size={32} strokeWidth={1.5} color="#A8A29E" />
                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#57534E' }}>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIdx) => (
                <tr key={row.id || rowIdx}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx}>
                      {col.render ? col.render(row) : col.accessor ? String(row[col.accessor] ?? '') : ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
