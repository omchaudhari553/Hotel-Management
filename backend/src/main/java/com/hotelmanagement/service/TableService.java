package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class TableService {
    private final HotelService core;
    public TableService(HotelService core) {
        this.core=core;
    }
    public List<Map<String,Object>> list() {
        return list(null);
    }
    public List<Map<String,Object>> list(Long branchId) {
        return core.tables(branchId);
    }
    public Map<String,Object> create(TableRequest r) {
        return core.createTable(r);
    }
    public Map<String,Object> status(Long id,String s) {
        return core.tableStatus(id,s);
    }
    public Map<String,Object> getById(Long id) {
        return core.getTableById(id);
    }
    public Map<String,Object> update(Long id,TableRequest r) {
        return core.updateTable(id,r);
    }
    public Map<String,Object> delete(Long id) {
        return core.deleteTable(id);
    }
}
