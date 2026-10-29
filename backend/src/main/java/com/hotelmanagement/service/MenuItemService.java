package com.hotelmanagement.service;

import com.hotelmanagement.dto.HotelDtos.MenuItemRequest;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class MenuItemService {
    private final HotelService core;

    public MenuItemService(HotelService core) {
        this.core = core;
    }

    public List<Map<String, Object>> list(String category) {
        return core.menuItems(category);
    }

    public Map<String, Object> getById(Long id) {
        return core.getMenuItemById(id);
    }

    public Map<String, Object> create(MenuItemRequest r) {
        return core.createMenuItem(r);
    }

    public Map<String, Object> update(Long id, MenuItemRequest r) {
        return core.updateMenuItem(id, r);
    }

    public Map<String, Object> updateAvailability(Long id, boolean available) {
        return core.updateMenuItemAvailability(id, available);
    }

    public Map<String, Object> delete(Long id) {
        return core.deleteMenuItem(id);
    }
}
