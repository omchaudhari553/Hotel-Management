package com.hotelmanagement.repository.saas;

import com.hotelmanagement.entity.saas.SaasProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SaasProductRepository extends JpaRepository<SaasProduct, Long> {
    Optional<SaasProduct> findByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);
}
