package com.hotelmanagement.repository;
import com.hotelmanagement.entity.HotelOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface HotelOrderRepository extends JpaRepository<HotelOrder,Long> {
    List<HotelOrder> findAllByBusinessId(Long businessId);
    long countByBusinessId(Long businessId);
    Optional<HotelOrder> findByIdAndBusinessId(Long id,Long businessId);
    Optional<HotelOrder> findByBusinessIdAndExternalPlatformAndExternalOrderId(Long businessId,String externalPlatform,String externalOrderId);
    boolean existsByTableIdAndStatusIn(Long tableId, java.util.List<com.hotelmanagement.enums.OrderStatus> statuses);
    List<HotelOrder> findByTableIdAndStatusIn(Long tableId, java.util.List<com.hotelmanagement.enums.OrderStatus> statuses);
    Optional<HotelOrder> findFirstByTableIdAndStatusInOrderByIdDesc(Long tableId, java.util.List<com.hotelmanagement.enums.OrderStatus> statuses);
}
