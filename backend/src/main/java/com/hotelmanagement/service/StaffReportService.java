package com.hotelmanagement.service;
import org.springframework.stereotype.Service;
import java.util.*;

@Service 
public class StaffReportService {
    private final ReportService core;
    public StaffReportService(ReportService core) {
        this.core=core;
    }
    public java.util.List<java.util.Map<String,Object>> get() {
        return core.staff();
    }
}
