package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class StaffService {
    private final HotelService core;
    public StaffService(HotelService core) {
        this.core=core;
    }
    public List<Map<String,Object>> list() {
        return list(null);
    }
    public List<Map<String,Object>> list(Long branchId) {
        return core.staff(branchId);
    }
    public Map<String,Object> create(StaffRequest r) {
        return core.createStaff(r);
    }
    public Map<String,Object> getById(Long id) {
        return core.getStaffById(id);
    }
    public Map<String,Object> update(Long id,StaffRequest r) {
        return core.updateStaff(id,r);
    }
    public Map<String,Object> delete(Long id) {
        return core.deleteStaff(id);
    }
}
