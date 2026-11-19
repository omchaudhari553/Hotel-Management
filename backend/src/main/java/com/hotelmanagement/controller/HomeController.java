package com.hotelmanagement.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@Tag(name="System",description="System endpoints")

public class HomeController {
    @GetMapping("/")
    @Operation(summary="Backend status")
    public Map<String,Object> home() {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("status","UP");
        m.put("service","Hotel Management Backend");
        m.put("swagger","/swagger-ui.html");
        m.put("apiDocs","/v3/api-docs");
        return m;
    }
    @GetMapping("/error")
    public Map<String,Object> error() {
        return Map.of("status","ERROR","service","Hotel Management Backend");
    }
}
