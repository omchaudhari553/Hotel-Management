package com.hotelmanagement.exception;
import com.hotelmanagement.dto.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.*;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(NotFoundException.class) ResponseEntity<ApiResponse<Object>> nf(NotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail(e.getMessage(), null));
    }
    @ExceptionHandler(ConflictException.class) ResponseEntity<ApiResponse<Object>> cf(ConflictException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.fail(e.getMessage(), null));
    }
    @ExceptionHandler(BadRequestException.class) ResponseEntity<ApiResponse<Object>> br(BadRequestException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail(e.getMessage(), null));
    }
    @ExceptionHandler({
        MethodArgumentNotValidException.class, ConstraintViolationException.class
    })
    ResponseEntity<ApiResponse<Object>> ve(Exception e) {
        String msg = "Validation failed";
        if (e instanceof MethodArgumentNotValidException mane && mane.getBindingResult().getFieldError() != null) {
            msg = mane.getBindingResult().getFieldError().getDefaultMessage();
        } else if (e.getMessage() != null) {
            msg = e.getMessage();
        }
        return ResponseEntity.badRequest().body(ApiResponse.fail(msg, e.getMessage()));
    }
    @ExceptionHandler(BadCredentialsException.class) ResponseEntity<ApiResponse<Object>> bc(BadCredentialsException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.fail(e.getMessage(), null));
    }
    @ExceptionHandler(AuthenticationException.class) ResponseEntity<ApiResponse<Object>> ae(AuthenticationException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.fail("Authentication required", null));
    }
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class) ResponseEntity<ApiResponse<Object>> ad(Exception e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.fail("Forbidden", null));
    }
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    ResponseEntity<ApiResponse<Object>> nrf(org.springframework.web.servlet.resource.NoResourceFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Resource not found", e.getMessage()));
    }
    @ExceptionHandler(Exception.class) ResponseEntity<ApiResponse<Object>> ge(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.fail("Internal server error", e.getMessage()));
    }
}
