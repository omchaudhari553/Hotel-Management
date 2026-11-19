package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.SettingRequest;
import com.hotelmanagement.entity.HotelSetting;
import com.hotelmanagement.repository.HotelSettingRepository;
import com.hotelmanagement.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service 
public class SettingsService {
    private final CurrentUser cu;
    private final HotelSettingRepository repo;
    public SettingsService(CurrentUser cu,HotelSettingRepository repo) {
        this.cu=cu;
        this.repo=repo;
    }
    public List<Map<String,Object>> list() {
        return repo.findAllByBusinessId(cu.businessId()).stream().map(this::map).toList();
    }
    @Transactional
    public Map<String,Object> save(SettingRequest r) {
        HotelSetting x = repo.findByBusinessIdAndCategoryAndSettingKey(cu.businessId(), r.category(), r.settingKey())
                .orElse(null);
        if (x == null) {
            List<HotelSetting> allForCat = repo.findAllByBusinessIdAndCategory(cu.businessId(), r.category());
            for (HotelSetting existing : allForCat) {
                if (r.settingKey().equalsIgnoreCase(existing.getSettingKey())) {
                    x = existing;
                    break;
                }
            }
        }
        if (x == null) {
            x = new HotelSetting();
            x.setBusiness(cu.get().getBusiness());
            x.setCategory(r.category());
            x.setSettingKey(r.settingKey());
        }
        x.setSettingValue(r.settingValue());
        return map(repo.save(x));
    }
    private Map<String,Object> map(HotelSetting x) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",x.getId());
        m.put("category",x.getCategory());
        m.put("settingKey",x.getSettingKey());
        m.put("settingValue",x.getSettingValue());
        return m;
    }
}
