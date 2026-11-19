package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class OrderService {
    private final HotelService core;
    public OrderService(HotelService core) {
        this.core=core;
    }
    public List<Map<String,Object>> list() {
        return list(null);
    }
    public List<Map<String,Object>> list(Long branchId) {
        return core.orders(branchId);
    }
    public Map<String,Object> create(OrderRequest r) {
        return core.createOrder(r);
    }
    public Map<String,Object> getById(Long id) {
        return core.getOrderById(id);
    }
    public Map<String,Object> update(Long id,OrderRequest r) {
        return core.updateOrder(id,r);
    }
    public Map<String,Object> status(Long id,String s) {
        return core.orderStatus(id,s);
    }
}
