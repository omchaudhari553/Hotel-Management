package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class SupplierService {
    private final HotelService core;
    public SupplierService(HotelService core) {
        this.core=core;
    }
    public List<Map<String,Object>> list() {
        return core.suppliers();
    }
    public Map<String,Object> create(SupplierRequest r) {
        return core.createSupplier(r);
    }
    public Map<String,Object> getById(Long id) {
        return core.getSupplierById(id);
    }
    public Map<String,Object> update(Long id,SupplierRequest r) {
        return core.updateSupplier(id,r);
    }
    public Map<String,Object> delete(Long id) {
        return core.deleteSupplier(id);
    }
}
