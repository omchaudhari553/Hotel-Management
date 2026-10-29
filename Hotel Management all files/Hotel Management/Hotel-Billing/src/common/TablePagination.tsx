import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export interface TablePaginationProps {
  currentPage: number;
  totalRecords: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalRecords,
  pageSize = 10,
  onPageChange,
  accentColor = "#8B3E16",
  className = "",
  style = {},
}) => {
  const { t, toDevanagari, language } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startRecord = totalRecords === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRecord = Math.min(totalRecords, safePage * pageSize);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (safePage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "...",
      safePage - 1,
      safePage,
      safePage + 1,
      "...",
      totalPages,
    ];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`table-pagination-container ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px",
        background: "#FFFFFF",
        borderTop: "1px solid #E5DCD5",
        borderRadius: "0 0 11px 11px",
        flexWrap: "wrap",
        gap: "12px",
        fontSize: "13px",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {/* Range and Total Records display */}
      <div
        className="pagination-record-count"
        style={{
          color: "#6B5E55",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {language === "mr" ? (
          <span>
            {t("showing", "दाखवत आहे")}{" "}
            <strong style={{ color: "#241C18" }}>
              {toDevanagari(startRecord)}–{toDevanagari(endRecord)}
            </strong>{" "}
            (एकूण{" "}
            <strong style={{ color: "#241C18" }}>{toDevanagari(totalRecords)}</strong>{" "}
            {t("records", "नोंदी")})
          </span>
        ) : language === "hi" ? (
          <span>
            {t("showing", "दिखा रहा है")}{" "}
            <strong style={{ color: "#241C18" }}>
              {toDevanagari(startRecord)}–{toDevanagari(endRecord)}
            </strong>{" "}
            (कुल{" "}
            <strong style={{ color: "#241C18" }}>{toDevanagari(totalRecords)}</strong>{" "}
            {t("records", "रिकॉर्ड")})
          </span>
        ) : (
          <span>
            Showing{" "}
            <strong style={{ color: "#241C18" }}>
              {startRecord}–{endRecord}
            </strong>{" "}
            of{" "}
            <strong style={{ color: "#241C18" }}>{totalRecords}</strong>{" "}
            records
          </span>
        )}
      </div>

      {/* Navigation Buttons and Page Numbers */}
      <div
        className="pagination-controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 12px",
            borderRadius: "7px",
            border: "1px solid #D6C2B4",
            background: safePage <= 1 ? "#F7F4F0" : "#FFFFFF",
            color: safePage <= 1 ? "#A89C92" : "#4A3B32",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: safePage <= 1 ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            opacity: safePage <= 1 ? 0.6 : 1,
          }}
          aria-label="Previous Page"
        >
          <ChevronLeft size={15} />
          <span>{t("previous", "Previous")}</span>
        </button>

        {/* Page numbers */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    padding: "0 4px",
                    color: "#9C8E85",
                    fontWeight: 700,
                    userSelect: "none",
                  }}
                >
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === safePage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                style={{
                  minWidth: "32px",
                  height: "32px",
                  padding: "0 8px",
                  borderRadius: "7px",
                  border: `1px solid ${isActive ? accentColor : "#E5DCD5"}`,
                  background: isActive ? accentColor : "#FFFFFF",
                  color: isActive ? "#FFFFFF" : "#4A3B32",
                  fontSize: "12.5px",
                  fontWeight: isActive ? 700 : 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                }}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Page ${pageNum}`}
              >
                {toDevanagari(pageNum)}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 12px",
            borderRadius: "7px",
            border: "1px solid #D6C2B4",
            background: safePage >= totalPages ? "#F7F4F0" : "#FFFFFF",
            color: safePage >= totalPages ? "#A89C92" : "#4A3B32",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: safePage >= totalPages ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            opacity: safePage >= totalPages ? 0.6 : 1,
          }}
          aria-label="Next Page"
        >
          <span>{t("next", "Next")}</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
