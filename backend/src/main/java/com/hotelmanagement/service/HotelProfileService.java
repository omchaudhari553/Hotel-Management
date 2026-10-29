package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.BusinessProfileRequest;
import com.hotelmanagement.entity.Business;
import com.hotelmanagement.repository.BusinessRepository;
import com.hotelmanagement.security.CurrentUser;
import org.springframework.stereotype.Service;
import java.util.*;

@Service 
public class HotelProfileService {
    private final CurrentUser cu;
    private final BusinessRepository repo;
    public HotelProfileService(CurrentUser cu,BusinessRepository repo) {
        this.cu=cu;
        this.repo=repo;
    }
    public Map<String,Object> get() {
        return map(repo.findById(cu.businessId()).orElseThrow());
    }
    public Map<String,Object> update(BusinessProfileRequest r) {
        Business b=repo.findById(cu.businessId()).orElseThrow();
        b.setName(r.name());
        b.setOwnerName(r.ownerName());
        b.setContactEmail(r.contactEmail());
        b.setPhone(r.phone());
        b.setAddress(r.address());
        b.setCity(r.city());
        b.setState(r.state());
        b.setCurrency(r.currency());
        b.setTaxNumber(r.taxNumber());
        return map(repo.save(b));
    }
    private Map<String,Object> map(Business b) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",b.getId());
        m.put("name",b.getName());
        m.put("code",b.getCode());
        m.put("ownerName",b.getOwnerName());
        m.put("contactEmail",b.getContactEmail());
        m.put("phone",b.getPhone());
        m.put("address",b.getAddress());
        m.put("city",b.getCity());
        m.put("state",b.getState());
        m.put("currency",b.getCurrency());
        m.put("taxNumber",b.getTaxNumber());
        m.put("active",b.isActive());
        return m;
    }
}
