package com.hotelmanagement.service;

import com.hotelmanagement.dto.HotelDtos.*;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class GoodsReceiptService {
    private final FinancialService core;

    public GoodsReceiptService(FinancialService core) {
        this.core = core;
    }

    public List<Map<String, Object>> list() {
        return core.goodsReceipts();
    }

    public Map<String, Object> create(GoodsReceiptRequest r) {
        return core.createGoodsReceipt(r);
    }
}
