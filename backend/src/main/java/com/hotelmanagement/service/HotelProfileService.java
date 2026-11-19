package com.hotelmanagement.service;

import com.hotelmanagement.dto.HotelDtos.BusinessProfileRequest;
import com.hotelmanagement.entity.Business;
import com.hotelmanagement.entity.User;
import com.hotelmanagement.enums.UserRole;
import com.hotelmanagement.repository.BusinessRepository;
import com.hotelmanagement.repository.UserRepository;
import com.hotelmanagement.security.CurrentUser;
import org.springframework.stereotype.Service;

import java.util.*;

@Service 
public class HotelProfileService {
    private final CurrentUser cu;
    private final BusinessRepository repo;
    private final UserRepository userRepo;

    public HotelProfileService(CurrentUser cu, BusinessRepository repo, UserRepository userRepo) {
        this.cu = cu;
        this.repo = repo;
        this.userRepo = userRepo;
    }

    public Map<String,Object> get() {
        return map(repo.findById(cu.businessId()).orElseThrow());
    }

    public Map<String,Object> update(BusinessProfileRequest r) {
        Business b = repo.findById(cu.businessId()).orElseThrow();
        if (r.name() != null && !r.name().isBlank()) b.setName(r.name().trim());
        if (r.ownerName() != null) b.setOwnerName(r.ownerName().trim());
        if (r.contactEmail() != null && !r.contactEmail().isBlank()) b.setContactEmail(r.contactEmail().trim());
        if (r.phone() != null) b.setPhone(r.phone().trim());
        if (r.address() != null) b.setAddress(r.address().trim());
        if (r.city() != null) b.setCity(r.city().trim());
        if (r.state() != null) b.setState(r.state().trim());
        if (r.currency() != null) b.setCurrency(r.currency().trim());
        if (r.taxNumber() != null) b.setTaxNumber(r.taxNumber().trim());
        Business saved = repo.save(b);

        // Also sync owner/admin user email if contactEmail changed
        if (r.contactEmail() != null && !r.contactEmail().isBlank() && r.contactEmail().contains("@")) {
            List<User> bizUsers = userRepo.findAllByBusinessId(saved.getId());
            for (User u : bizUsers) {
                if (u.getRole() == UserRole.OWNER || u.getRole() == UserRole.ADMIN) {
                    u.setEmail(r.contactEmail().trim());
                    userRepo.save(u);
                }
            }
        }

        return map(saved);
    }

    public Map<String,Object> updateFromMap(Map<String, Object> data) {
        Business b = repo.findById(cu.businessId()).orElseThrow();

        if (data.containsKey("name") && data.get("name") != null && !String.valueOf(data.get("name")).isBlank()) {
            b.setName(String.valueOf(data.get("name")).trim());
        } else if (data.containsKey("hotelName") && data.get("hotelName") != null && !String.valueOf(data.get("hotelName")).isBlank()) {
            b.setName(String.valueOf(data.get("hotelName")).trim());
        }

        if (data.containsKey("ownerName") && data.get("ownerName") != null) {
            b.setOwnerName(String.valueOf(data.get("ownerName")).trim());
        }

        String emailVal = null;
        if (data.containsKey("contactEmail") && data.get("contactEmail") != null) {
            emailVal = String.valueOf(data.get("contactEmail")).trim();
        } else if (data.containsKey("email") && data.get("email") != null) {
            emailVal = String.valueOf(data.get("email")).trim();
        }
        if (emailVal != null && !emailVal.isBlank()) {
            b.setContactEmail(emailVal);
        }

        String phoneVal = null;
        if (data.containsKey("phone") && data.get("phone") != null) {
            phoneVal = String.valueOf(data.get("phone")).trim();
        } else if (data.containsKey("mobile") && data.get("mobile") != null) {
            phoneVal = String.valueOf(data.get("mobile")).trim();
        }
        if (phoneVal != null && !phoneVal.isBlank()) {
            b.setPhone(phoneVal);
        }

        if (data.containsKey("address") && data.get("address") != null) {
            b.setAddress(String.valueOf(data.get("address")).trim());
        }
        if (data.containsKey("city") && data.get("city") != null) {
            b.setCity(String.valueOf(data.get("city")).trim());
        }
        if (data.containsKey("state") && data.get("state") != null) {
            b.setState(String.valueOf(data.get("state")).trim());
        }
        if (data.containsKey("currency") && data.get("currency") != null) {
            b.setCurrency(String.valueOf(data.get("currency")).trim());
        }
        if (data.containsKey("taxNumber") && data.get("taxNumber") != null) {
            b.setTaxNumber(String.valueOf(data.get("taxNumber")).trim());
        }

        Business saved = repo.save(b);

        if (emailVal != null && emailVal.contains("@")) {
            List<User> bizUsers = userRepo.findAllByBusinessId(saved.getId());
            for (User u : bizUsers) {
                if (u.getRole() == UserRole.OWNER || u.getRole() == UserRole.ADMIN) {
                    u.setEmail(emailVal);
                    userRepo.save(u);
                }
            }
        }

        return map(saved);
    }

    private Map<String,Object> map(Business b) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", b.getId());
        m.put("name", b.getName());
        m.put("code", b.getCode());
        m.put("ownerName", b.getOwnerName());
        m.put("contactEmail", b.getContactEmail());
        m.put("phone", b.getPhone());
        m.put("address", b.getAddress());
        m.put("city", b.getCity());
        m.put("state", b.getState());
        m.put("currency", b.getCurrency());
        m.put("taxNumber", b.getTaxNumber());
        m.put("active", b.isActive());
        return m;
    }
}
