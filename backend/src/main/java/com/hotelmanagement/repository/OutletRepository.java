package com.hotelmanagement.repository;
import com.hotelmanagement.entity.Outlet;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface OutletRepository extends JpaRepository<Outlet,Long> {
    Optional<Outlet> findByIdAndBranchBusinessId(Long id, Long businessId);
    List<Outlet> findAllByBranchBusinessId(Long businessId);
}
