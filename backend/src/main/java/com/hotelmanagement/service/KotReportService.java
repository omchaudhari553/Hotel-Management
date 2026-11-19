package com.hotelmanagement.service;
import org.springframework.stereotype.Service;
import java.util.*;

@Service 
public class KotReportService {
    private final ReportService core;
    public KotReportService(ReportService core) {
        this.core=core;
    }
    public java.util.List<java.util.Map<String,Object>> get() {
        return core.kot();
    }
}
