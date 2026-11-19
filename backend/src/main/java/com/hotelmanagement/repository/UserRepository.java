package com.hotelmanagement.repository;

import com.hotelmanagement.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsernameIgnoreCase(String username);
    Optional<User> findByEmailIgnoreCase(String email);

    @EntityGraph(attributePaths = {"business", "branch"})
    Optional<User> findWithBusinessByUsernameIgnoreCase(String username);

    @EntityGraph(attributePaths = {"business", "branch"})
    Optional<User> findWithBusinessByEmailIgnoreCase(String email);

    Optional<User> findFirstByBranchId(Long branchId);
    List<User> findAllByBusinessId(Long businessId);
    List<User> findAllByBusinessIdAndBranchId(Long businessId, Long branchId);
    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByBusinessIdAndUsernameIgnoreCase(Long businessId, String username);
}
