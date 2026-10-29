package com.hotelmanagement.service;
import java.math.*;


public final class FinancialCalculator {
    private FinancialCalculator() {
    }
    public static BigDecimal lineTotal(BigDecimal quantity,BigDecimal unitPrice) {
        return quantity.multiply(unitPrice).setScale(2,RoundingMode.HALF_UP);
    }
    public static BigDecimal tax(BigDecimal taxable,BigDecimal rate) {
        return taxable.multiply(rate).divide(BigDecimal.valueOf(100),2,RoundingMode.HALF_UP);
    }
    public static BigDecimal due(BigDecimal total,BigDecimal paid) {
        return total.subtract(paid).max(BigDecimal.ZERO);
    }
}
