package com.hotelmanagement.service;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class FinancialCalculatorTest {
    @Test void calculatesLineTotal() {
        assertEquals(new BigDecimal("600.00"),FinancialCalculator.lineTotal(new BigDecimal("2"),new BigDecimal("300")));
    }
    @Test void calculatesTax() {
        assertEquals(new BigDecimal("108.00"),FinancialCalculator.tax(new BigDecimal("600"),new BigDecimal("18")));
    }
    @Test void neverReturnsNegativeDue() {
        assertEquals(BigDecimal.ZERO,FinancialCalculator.due(new BigDecimal("100"),new BigDecimal("120")));
    }
}
