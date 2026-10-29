package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class AttendanceService {
    private final HotelService core;
    public AttendanceService(HotelService core) {
        this.core=core;
    }
    public List<Map<String,Object>> list() {
        return core.attendance();
    }
    public List<Map<String,Object>> list(java.time.LocalDate date, Long staffId, String status) {
        return core.attendance(date, staffId, status);
    }
    public Map<String,Object> summary(java.time.LocalDate date) {
        return core.attendanceSummary(date);
    }
    public Map<String,Object> save(AttendanceRequest r) {
        return core.attendance(r);
    }
}
