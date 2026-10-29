package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class KotService {
    private final HotelService core;
    public KotService(HotelService core) {
        this.core=core;
    }
    public List<Map<String,Object>> list() {
        return core.kots();
    }
    public List<Map<String,Object>> list(Long branchId) {
        return core.kots(branchId);
    }
    public List<Map<String,Object>> list(Long branchId, java.time.LocalDate startDate, java.time.LocalDate endDate) {
        return core.kots(branchId, startDate, endDate);
    }
    public Map<String,Object> create(KotRequest r) {
        return core.createKot(r);
    }
    public Map<String,Object> getById(Long id) {
        return core.getKotById(id);
    }
    public Map<String,Object> status(Long id,String s) {
        return core.kotStatus(id,s);
    }
}
