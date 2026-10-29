package com.hotelmanagement.repository;
import com.hotelmanagement.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsernameIgnoreCase(String username);
    Optional<User> findByEmailIgnoreCase(String email);
    @EntityGraph(attributePaths = {
        "business"
    }
    ) Optional<User> findWithBusinessByUsernameIgnoreCase(String username);
    @EntityGraph(attributePaths = {
        "business"
    }
    ) Optional<User> findWithBusinessByEmailIgnoreCase(String email);
}
