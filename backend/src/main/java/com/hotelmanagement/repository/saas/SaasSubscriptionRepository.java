package com.hotelmanagement.repository.saas;

import com.hotelmanagement.entity.saas.SaasSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaasSubscriptionRepository extends JpaRepository<SaasSubscription, Long> {

    List<SaasSubscription> findAllByBusinessId(Long businessId);

    List<SaasSubscription> findAllByBranchId(Long branchId);

    List<SaasSubscription> findAllByProductId(Long productId);

    List<SaasSubscription> findAllByStatusIgnoreCase(String status);

    Optional<SaasSubscription> findFirstByBusinessIdAndProductCodeIgnoreCaseOrderByIdDesc(Long businessId, String productCode);

    Optional<SaasSubscription> findFirstByBranchIdAndProductCodeIgnoreCaseOrderByIdDesc(Long branchId, String productCode);

    long countByStatusIgnoreCase(String status);

    long countByIsLifetimeTrue();

    @Query("SELECT COUNT(s) FROM SaasSubscription s WHERE s.product.code = :code AND s.status = 'ACTIVE'")
    long countActiveByProductCode(@Param("code") String code);

    @Query("SELECT COUNT(s) FROM SaasSubscription s WHERE s.status = 'ACTIVE' AND s.endDate IS NOT NULL AND s.endDate BETWEEN :now AND :soon")
    long countExpiringSoon(@Param("now") LocalDateTime now, @Param("soon") LocalDateTime soon);
}
