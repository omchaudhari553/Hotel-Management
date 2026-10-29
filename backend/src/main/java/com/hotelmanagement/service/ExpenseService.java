package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class ExpenseService {
    private final HotelService core;
    public ExpenseService(HotelService core) {
        this.core=core;
    }
    public List<Map<String,Object>> list() {
        return core.expenses(null);
    }
    public List<Map<String,Object>> list(Long branchId) {
        return core.expenses(branchId);
    }
    public Map<String,Object> create(ExpenseRequest r) {
        return core.createExpense(r);
    }
    public Map<String,Object> getById(Long id) {
        return core.getExpenseById(id);
    }
    public Map<String,Object> update(Long id,ExpenseRequest r) {
        return core.updateExpense(id,r);
    }
    public Map<String,Object> delete(Long id) {
        return core.deleteExpense(id);
    }
}
