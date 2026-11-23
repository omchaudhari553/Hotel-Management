package com.hotelmanagement.repository.saas;

import com.hotelmanagement.entity.saas.SaasProductModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaasProductModuleRepository extends JpaRepository<SaasProductModule, Long> {
    List<SaasProductModule> findAllByProductId(Long productId);
    List<SaasProductModule> findAllByProductCodeIgnoreCase(String productCode);
}
