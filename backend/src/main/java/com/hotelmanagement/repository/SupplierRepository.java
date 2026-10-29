package com.hotelmanagement.repository;
import com.hotelmanagement.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface SupplierRepository extends JpaRepository<Supplier,Long> {
    List<Supplier> findAllByBusinessId(Long businessId);
    Optional<Supplier> findByIdAndBusinessId(Long id,Long businessId);
}
